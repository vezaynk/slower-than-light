#!/usr/bin/env node
/**
 * Per the user: move user-facing text into src/i18n/en.json so the copy can be replaced later without touching code.
 *
 * Rewrites prose string literals, template literals and JSX text in the game's source files into `tx("key", vars)`
 * calls (src/i18n/index.ts) and writes every key -> text pair to src/i18n/en.json. Re-runnable: files already
 * converted keep their keys, and new prose is appended.
 *
 *   node scripts/i18n-codemod.mjs            # rewrite files and en.json
 *   node scripts/i18n-codemod.mjs --dry      # report what would change
 *
 * What counts as user-facing text is a heuristic (prose: letters plus a space, or sentence punctuation, or a
 * capitalised word). Strings in identifier positions are left alone: comparisons, switch cases, object keys, imports,
 * types, `as const` tuples, Set/Map keys, DOM/CSS APIs, and properties that name things for lookups (SKIP_PROPS).
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const EN = path.join(ROOT, "src/i18n/en.json");
const DRY = process.argv.includes("--dry");
const FN = "tx";

const DIRS = ["src/game", "src/components/game"];
const SKIP_FILE = (f) => /\.test\.tsx?$/.test(f) || f.endsWith("selftest.ts") || f.includes("/dump/") || f.endsWith(".d.ts");

/** Properties whose string values are identifiers or lookups, not display text. */
const SKIP_PROPS = new Set([
  "id", "ref", "kind", "slug", "flag", "dest", "aliases", "sectors", "page", "key", "className", "class", "style",
  "href", "src", "type", "role", "mode", "tier", "faction", "wall", "system", "kit", "icon", "tone", "sector",
  "sectorName", "cssText", "event", "outoffuel", "code", "url", "path", "file", "group", "tag", "hullId", "defId",
]);
/** JSX attributes that carry display text. Every other attribute is left alone, expressions included. */
const TEXT_ATTRS = new Set(["title", "aria-label", "placeholder", "alt", "label", "note", "caption", "heading", "text", "hint", "detail"]);
/** Methods whose (first) string argument is a lookup key, selector, event name or similar. */
const SKIP_METHODS = new Set([
  "includes", "startsWith", "endsWith", "indexOf", "lastIndexOf", "get", "has", "set", "delete", "add", "querySelector",
  "querySelectorAll", "closest", "matches", "matchMedia", "getElementById", "setAttribute", "getAttribute",
  "removeAttribute", "hasAttribute", "addEventListener", "removeEventListener", "getPropertyValue", "setProperty",
  "removeProperty", "split", "join", "getItem", "setItem", "removeItem", "toggle", "contains", "createElement", "test",
  "exec", "replace", "replaceAll", "dispatchEvent", "postMessage", "padStart", "padEnd", "localeCompare", "lock",
  "vibrate", "find", "filter", "some", "every", "push"
]);
/** `push` is only skipped when the receiver looks like an id list; see isIdPush. */
const SKIP_CALLEES = new Set([
  "require", "Error", "TypeError", "RangeError", "Symbol", "RegExp", "Event", "CustomEvent", "fetch", "describe", "it",
  "test", "assert", "structuredClone", "cn", "clsx", "classNames", "Set", "Map", "WeakMap", "WeakSet", "Intl",
]);
const RESERVED_VARS = new Set(["count", "context", "lng", "lngs", "ns", "defaultValue", "returnObjects", "replace", "interpolation", "keyPrefix", "ordinal", "postProcess", "joinArrays"]);

function prose(text) {
  if (!/[A-Za-z]/.test(text)) return false;
  if (text.includes("{{") || text.includes("$t(")) return false;
  const s = text.trim();
  if (!s) return false;
  if (/^[a-z0-9_-]+(:[a-z0-9_-]+)*$/.test(s)) return false; // ids like "c:slocknog:0"
  if (/^[A-Za-z0-9_.-]+\.(ts|tsx|js|json|css|png|svg|jpg)$/.test(s)) return false;
  if (/^(https?:|\/|#|\.\/|\.\.\/)/.test(s)) return false;
  if (/[;{}<>]|=>|\(\)/.test(s) && !/[.!?]$/.test(s)) return false; // code/CSS fragments
  if (/\d+(px|em|rem|vh|vw|deg|ms)\b/.test(s)) return false; // CSS values, fonts
  const bare = s.replace(/\{\{[^}]+\}\}/g, "x");
  if (/^[a-z0-9_-]+( +[a-z0-9_-]+)*-?$/.test(bare)) return false; // class lists like "is-cycle is-x"
  if (/\s/.test(s)) return true;
  // One word: a capitalised or all-caps word, optionally with trailing punctuation ("Continue...", "HIT").
  return /^[A-Z][a-z']+[.!?…:]*$/.test(s) || /^[A-Z][A-Z']+[.!?…:]*$/.test(s);
}

function slug(text) {
  const words = text
    .toLowerCase()
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  return (words.join("-") || "text").slice(0, 48).replace(/-+$/, "");
}

function areaOf(file) {
  const rel = path.relative(path.join(ROOT, "src"), file).replace(/\.(tsx?|mjs)$/, "");
  return rel.replace(/^components\/game\//, "ui.").replace(/^game\/wiki\//, "wiki.").replace(/^game\/extras\//, "extras.").replace(/^game\//, "game.").replace(/\//g, ".");
}

/** Babel's JSX text cleaning (cleanJSXElementLiteralChild): what React actually renders. */
function cleanJsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  for (let i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i])) last = i;
  let str = "";
  for (let i = 0; i < lines.length; i++) {
    const isFirst = i === 0;
    const isLast = i === lines.length - 1;
    const isLastNonEmpty = i === last;
    let line = lines[i].replace(/\t/g, " ");
    if (!isFirst) line = line.replace(/^[ ]+/, "");
    if (!isLast) line = line.replace(/[ ]+$/, "");
    if (line) {
      if (!isLastNonEmpty) line += " ";
      str += line;
    }
  }
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");
}

const en = fs.existsSync(EN) ? JSON.parse(fs.readFileSync(EN, "utf8")) : {};
const byText = new Map(); // area + text -> key (reuse within a file)
for (const [k, v] of Object.entries(en)) {
  const area = k.split(".").slice(0, -1).join(".");
  byText.set(`${area}\u0000${v}`, k);
}

function keyFor(area, text) {
  const hit = byText.get(`${area}\u0000${text}`);
  if (hit) return hit;
  const base = `${area}.${slug(text)}`;
  let key = base;
  for (let n = 2; key in en; n++) key = `${base}-${n}`;
  en[key] = text;
  byText.set(`${area}\u0000${text}`, key);
  return key;
}

function inType(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isTypeNode(p) && !ts.isExpressionWithTypeArguments(p)) return true;
    if (ts.isStatement(p) || ts.isSourceFile(p)) return false;
  }
  return false;
}

function propName(name) {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isPrivateIdentifier(name)) return name.text;
  return undefined;
}

/** Why a string expression must stay a literal, or null when it is display text. */
function blocked(node) {
  if (inType(node)) return "type";
  let child = node;
  for (let p = node.parent; p; child = p, p = p.parent) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isImportTypeNode(p) || ts.isExternalModuleReference(p)) return "import";
    if (ts.isEnumMember(p) || ts.isDecorator(p)) return "enum";
    if (ts.isTaggedTemplateExpression(p)) return "tagged";
    if (ts.isAsExpression(p) && p.type.getText() === "const") return "as-const";
    if (ts.isCaseClause(p) && child === p.expression) return "case";
    if (ts.isBinaryExpression(p)) {
      const op = p.operatorToken.kind;
      if ([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword, ts.SyntaxKind.InstanceOfKeyword].includes(op)) return "compare";
      if (op === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(p.left) && SKIP_PROPS.has(p.left.name.text)) return "assign-prop";
    }
    if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) && child === p.name) return "prop-name";
    if (ts.isPropertyAssignment(p) && child === p.initializer && SKIP_PROPS.has(propName(p.name))) return "skip-prop";
    if (ts.isShorthandPropertyAssignment(p)) return "shorthand";
    if (ts.isElementAccessExpression(p) && child === p.argumentExpression) return "element-key";
    if (ts.isComputedPropertyName(p)) return "computed";
    if (ts.isJsxAttribute(p)) {
      const name = p.name.getText();
      return TEXT_ATTRS.has(name) ? null : "jsx-attr";
    }
    if (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent)) continue;
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      if (child === p.expression) return null;
      const callee = p.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      const owner = ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) ? callee.expression.text : "";
      if (name === FN) return "already";
      if (SKIP_CALLEES.has(name) || owner === "console" || owner === "assert" || owner === "Object" || owner === "JSON" || owner === "document" || owner === "localStorage" || owner === "sessionStorage") return "callee";
      if (ts.isPropertyAccessExpression(callee) && SKIP_METHODS.has(name)) {
        if (name === "push" || name === "find" || name === "filter" || name === "some" || name === "every") return null;
        return "method";
      }
      // An argument: the call decides; stop walking.
      return null;
    }
    if (ts.isReturnStatement(p) || ts.isVariableDeclaration(p) || ts.isExpressionStatement(p) || ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) return null;
    if (ts.isArrowFunction(p) || ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p) || ts.isFunctionExpression(p)) return null;
  }
  return null;
}

function varName(expr, used) {
  let base = "v";
  if (ts.isIdentifier(expr)) base = expr.text;
  else if (ts.isPropertyAccessExpression(expr)) base = expr.name.text;
  else if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) base = expr.expression.text;
  else if (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) base = expr.expression.name.text;
  base = base.replace(/[^A-Za-z0-9_]/g, "_") || "v";
  if (RESERVED_VARS.has(base)) base = `${base}_`;
  let name = base;
  for (let n = 2; used.has(name); n++) name = `${base}${n}`;
  used.add(name);
  return name;
}

function importPath(file) {
  let rel = path.relative(path.dirname(file), path.join(ROOT, "src/i18n/index.ts")).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return file.endsWith(".tsx") || file.includes("/components/") ? "@/i18n" : rel;
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(f));
    else if (/\.tsx?$/.test(e.name) && !SKIP_FILE(f)) out.push(f);
  }
  return out;
}

// The type checker tells identifier positions apart from text: a string whose contextual type is a literal union
// ("Human" | "Engi", SysId, ...) is a lookup value, not prose, and must stay a literal.
const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, "tsconfig.json");
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, ROOT);
const program = ts.createProgram({ rootNames: parsed.fileNames, options: { ...parsed.options, noEmit: true } });
const checker = program.getTypeChecker();

function literalOnly(type) {
  if (!type) return false;
  const parts = type.isUnion() ? type.types : [type];
  // Literal strings allowed and plain `string` not (other members, like a setter function, do not matter).
  const open = ts.TypeFlags.String | ts.TypeFlags.TemplateLiteral | ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.StringMapping;
  return parts.some((t) => t.flags & ts.TypeFlags.StringLiteral) && !parts.some((t) => t.flags & open);
}

function wantsLiteral(node) {
  try {
    return literalOnly(checker.getContextualType(node));
  } catch {
    return false;
  }
}

let total = 0;
const report = [];
for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const src = fs.readFileSync(file, "utf8");
    const sf = program.getSourceFile(file) ?? ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const area = areaOf(file);
    const edits = [];
    const visit = (node) => {
      if (ts.isJsxText(node)) {
        const text = cleanJsxText(node.text);
        if (text && prose(text)) {
          const parent = node.parent;
          // Skip text inside <style>, <script>, <code> elements.
          const tag = ts.isJsxElement(parent) ? parent.openingElement.tagName.getText() : "";
          if (!["style", "script", "code", "kbd"].includes(tag)) {
            edits.push({ start: node.getStart(sf, false) === node.pos ? node.pos : node.getStart(sf), end: node.end, text: `{${FN}(${JSON.stringify(keyFor(area, text))})}`, raw: text, jsxText: node });
          }
        }
        return;
      }
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        if (prose(node.text) && !blocked(node) && !wantsLiteral(node)) {
          const key = keyFor(area, node.text);
          const inJsxAttr = ts.isJsxAttribute(node.parent);
          edits.push({ start: node.getStart(sf), end: node.end, text: inJsxAttr ? `{${FN}(${JSON.stringify(key)})}` : `${FN}(${JSON.stringify(key)})`, raw: node.text });
        }
        return;
      }
      if (ts.isTemplateExpression(node)) {
        const statics = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" ");
        if (prose(statics) && !blocked(node) && !wantsLiteral(node)) {
          const used = new Set();
          let text = node.head.text;
          const vars = [];
          for (const span of node.templateSpans) {
            const name = varName(span.expression, used);
            vars.push(`${name}: ${span.expression.getText(sf)}`);
            text += `{{${name}}}${span.literal.text}`;
          }
          const key = keyFor(area, text);
          edits.push({ start: node.getStart(sf), end: node.end, text: `${FN}(${JSON.stringify(key)}, { ${vars.join(", ")} })`, raw: text });
          return; // expressions inside stay as they are (nested templates are rare)
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    if (!edits.length) continue;
    // JSX text replacements must keep the surrounding whitespace that React would render.
    let out = src;
    edits.sort((a, b) => b.start - a.start);
    for (const e of edits) {
      if (e.jsxText) {
        const raw = src.slice(e.jsxText.pos, e.jsxText.end);
        const leading = /^\s*\n\s*/.test(raw) ? raw.match(/^\s*/)[0] : "";
        const trailing = /\n\s*$/.test(raw) ? raw.match(/\s*$/)[0] : "";
        out = out.slice(0, e.jsxText.pos) + leading + e.text + trailing + out.slice(e.jsxText.end);
      } else out = out.slice(0, e.start) + e.text + out.slice(e.end);
    }
    if (!new RegExp(`import \\{[^}]*\\b${FN}\\b[^}]*\\} from "[^"]*i18n[^"]*";`).test(out)) {
      const imp = `import { ${FN} } from "${importPath(file)}";\n`;
      // After the leading comment block and before the first import (or at the top).
      const firstImport = out.search(/^import /m);
      out = firstImport >= 0 ? out.slice(0, firstImport) + imp + out.slice(firstImport) : imp + out;
    }
    total += edits.length;
    report.push(`${path.relative(ROOT, file)}: ${edits.length}`);
    if (process.env.PEEK && file.includes(process.env.PEEK)) for (const e of edits) console.log("  >", JSON.stringify(e.raw));
    if (!DRY) fs.writeFileSync(file, out);
  }
}

// Keys no longer used anywhere (text deleted, or a conversion undone by hand) are dropped.
const used = new Set();
for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    for (const m of fs.readFileSync(file, "utf8").matchAll(/\btx\("([^"]+)"/g)) used.add(m[1]);
  }
}
for (const key of Object.keys(en)) if (!used.has(key) && !DRY) delete en[key];

if (!DRY) {
  fs.mkdirSync(path.dirname(EN), { recursive: true });
  fs.writeFileSync(EN, `${JSON.stringify(en, null, 2)}\n`);
}
console.log(report.join("\n"));
console.log(`${total} strings, ${Object.keys(en).length} keys${DRY ? " (dry run)" : ""}`);

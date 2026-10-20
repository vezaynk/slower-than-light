import {
  DOMParser,
  Node,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";

const serializer = new XMLSerializer();

/**
 * Slipstream writes `mod:` and `mod-append:` with no namespace declaration.
 * xmldom rejects an unbound prefix, so each prefix in the file is bound for the parse.
 * The binding is not Slipstream syntax. It only lets the tags through.
 */
function slipstreamXmlns(xml: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const match of xml.matchAll(/(?:<|<\/|\s)([A-Za-z_][\w.-]*):/g)) {
    const prefix = match[1];
    if (!prefix || prefix === "xml" || prefix === "xmlns") continue;
    map[prefix] = `urn:slipstream:${prefix}`;
  }
  return map;
}

export type PatchKind = "append" | "rawappend" | "rawclobber";

export type PatchOptions = {
  /** A find that matches nothing throws, as Slipstream's `--global-panic` does. */
  panic?: boolean;
  /** Mod file path, included in parse and panic errors. */
  path?: string;
};

type FindKind = "findName" | "findLike" | "findWithChildLike" | "findComposite";

type FindSpec = {
  reverse: boolean;
  start: number;
  limit: number;
  panic: boolean;
};

/**
 * Applies one Slipstream patch to one XML file.
 * An append runs commands and adds plain elements under the root.
 * A raw append concatenates text after an `<FTL>` wrapper is removed, and puts that wrapper back.
 * A raw clobber replaces the file text.
 * Patching does not recode UTF-8.
 */
export function patchDocument(
  baseXml: string,
  patch: string,
  kind: PatchKind,
  options: PatchOptions = {},
): string {
  const path = options.path ?? "patch";
  if (kind === "rawclobber") return patch;
  if (kind === "rawappend") return rawAppend(baseXml, patch);
  const base = readXml(baseXml, path);
  const root = base.documentElement;
  if (!root) throw new Error(`${path}: the document has no root element.`);
  const extra = readXml(patch, path).documentElement;
  if (!extra) throw new Error(`${path}: the document has no root element.`);
  const ops = extra.tagName === "FTL" ? elementChildren(extra) : [extra];
  for (const op of ops) applyTop(base, root, op, options.panic === true, path);
  const xml = serializer.serializeToString(base);
  return xml.endsWith("\n") ? xml : `${xml}\n`;
}

function rawAppend(baseXml: string, patch: string): string {
  const base = splitFtl(baseXml);
  const extra = splitFtl(patch);
  const inner = extra.wrapped ? extra.inner : patch;
  if (!base.wrapped) return `${baseXml}${inner}`;
  return `${base.head}${base.open}${base.inner}${inner}${base.close}`;
}

function splitFtl(xml: string): {
  head: string;
  open: string;
  inner: string;
  close: string;
  wrapped: boolean;
} {
  const match = xml.match(/^(\s*(?:<\?xml\b[^?]*\?>\s*)?)(<FTL\b[^>]*>)([\s\S]*)(<\/FTL>\s*)$/i);
  if (!match) return { head: "", open: "", inner: xml, close: "", wrapped: false };
  return {
    head: match[1] ?? "",
    open: match[2] ?? "",
    inner: match[3] ?? "",
    close: match[4] ?? "",
    wrapped: true,
  };
}

function applyTop(
  doc: XmlDocument,
  root: XmlElement,
  node: XmlElement,
  globalPanic: boolean,
  path: string,
): void {
  const kind = findKind(node.tagName);
  if (kind) {
    runFind(node, kind, searchScope(root), globalPanic, path);
    return;
  }
  const prefix = prefixOf(node.tagName);
  if (prefix === "mod" || prefix === "mod-append" || prefix === "mod-overwrite") return;
  root.appendChild(doc.importNode(node, true));
}

function runFind(
  node: XmlElement,
  kind: FindKind,
  scope: XmlElement[],
  globalPanic: boolean,
  path: string,
): void {
  const chosen = choose(node, kind, scope, globalPanic, path);
  for (const match of chosen) {
    let alive = true;
    for (const command of commandNodes(node)) {
      if (!alive) break;
      alive = applyCommand(command, match, globalPanic, path);
    }
  }
}

function choose(
  node: XmlElement,
  kind: FindKind,
  scope: XmlElement[],
  globalPanic: boolean,
  path: string,
): XmlElement[] {
  const spec = readSpec(node, kind);
  const matches =
    kind === "findComposite"
      ? compositeMatches(node, scope, globalPanic, path)
      : listed(node, kind, scope);
  const chosen = take(matches, spec);
  if (chosen.length === 0 && (spec.panic || globalPanic)) {
    throw new Error(`${path}: ${describe(node)} matched nothing`);
  }
  return chosen;
}

function compositeMatches(
  node: XmlElement,
  scope: XmlElement[],
  globalPanic: boolean,
  path: string,
): XmlElement[] {
  const par = elementChildren(node).find((child) => child.tagName === "mod:par");
  if (!par) return [];
  return evalPar(par, scope, globalPanic, path);
}

function evalPar(
  par: XmlElement,
  scope: XmlElement[],
  globalPanic: boolean,
  path: string,
): XmlElement[] {
  const written = par.getAttribute("op");
  if (written == null || written.trim() === "") throw new Error(`${path}: mod:par needs an op`);
  const op = written.toUpperCase();
  if (op !== "AND" && op !== "OR") throw new Error(`${path}: unknown par op "${op}"`);
  const parts: XmlElement[][] = [];
  for (const child of elementChildren(par)) {
    if (child.tagName === "mod:par") {
      parts.push(evalPar(child, scope, globalPanic, path));
      continue;
    }
    const kind = findKind(child.tagName);
    if (!kind) continue;
    parts.push(choose(child, kind, scope, globalPanic, path));
  }
  if (parts.length === 0) return [];
  // An empty first list intersects to nothing. Slipstream adds the next criterion's
  // matches in that case. This keeps the intersection.
  if (op === "AND") {
    const rest = parts.slice(1).map((list) => new Set(list));
    return (parts[0] ?? []).filter((item) => rest.every((set) => set.has(item)));
  }
  const found = new Set<XmlElement>();
  for (const list of parts) for (const item of list) found.add(item);
  return scope.filter((item) => found.has(item));
}

function listed(node: XmlElement, kind: FindKind, scope: XmlElement[]): XmlElement[] {
  if (kind === "findName") {
    const type = node.getAttribute("type");
    const name = node.getAttribute("name");
    return scope.filter(
      (item) =>
        (type == null || item.tagName === type) &&
        (name == null || item.getAttribute("name") === name),
    );
  }
  const type = node.getAttribute("type");
  const selector = elementChildren(node).find((child) => child.tagName === "mod:selector");
  if (kind === "findWithChildLike") {
    const childType = node.getAttribute("child-type");
    return scope.filter((item) => {
      if (type != null && item.tagName !== type) return false;
      return elementChildren(item).some((child) => like(child, childType, selector));
    });
  }
  return scope.filter((item) => like(item, type, selector));
}

function like(node: XmlElement, type: string | null, selector: XmlElement | undefined): boolean {
  if (type != null && node.tagName !== type) return false;
  if (!selector) return true;
  for (let i = 0; i < selector.attributes.length; i++) {
    const attr = selector.attributes.item(i);
    if (!attr) continue;
    if (node.getAttribute(attr.name) !== attr.value) return false;
  }
  const wanted = ownText(selector);
  if (wanted.trim() === "") return true;
  return ownText(node).trim() === wanted.trim();
}

function applyCommand(
  command: XmlElement,
  match: XmlElement,
  globalPanic: boolean,
  path: string,
): boolean {
  const kind = findKind(command.tagName);
  if (kind) {
    runFind(command, kind, elementChildren(match), globalPanic, path);
    return true;
  }
  const tag = command.tagName;
  if (tag === "mod:setValue") {
    const doc = match.ownerDocument;
    if (!doc) return true;
    while (match.firstChild) match.removeChild(match.firstChild);
    match.appendChild(doc.createTextNode((command.textContent ?? "").trim()));
    return true;
  }
  if (tag === "mod:setAttributes") {
    for (let i = 0; i < command.attributes.length; i++) {
      const attr = command.attributes.item(i);
      if (!attr || attr.name === "xmlns" || attr.name.startsWith("xmlns:")) continue;
      match.setAttribute(attr.name, attr.value);
    }
    return true;
  }
  if (tag === "mod:removeAttributes") {
    for (let i = 0; i < command.attributes.length; i++) {
      const attr = command.attributes.item(i);
      if (!attr || attr.name === "xmlns" || attr.name.startsWith("xmlns:")) continue;
      match.removeAttribute(attr.name);
    }
    return true;
  }
  if (tag === "mod:removeTag") {
    match.parentNode?.removeChild(match);
    return false;
  }
  const prefix = prefixOf(tag);
  if (prefix !== "mod-append" && prefix !== "mod-overwrite") return true;
  const doc = match.ownerDocument;
  if (!doc) return true;
  const next = payload(doc, command);
  if (prefix === "mod-append") {
    match.appendChild(next);
    return true;
  }
  const name = next.tagName;
  for (const child of elementChildren(match)) {
    if (child.tagName !== name) continue;
    match.replaceChild(next, child);
    return true;
  }
  match.appendChild(next);
  return true;
}

function payload(doc: XmlDocument, command: XmlElement): XmlElement {
  const node = doc.createElement(localName(command.tagName));
  for (let i = 0; i < command.attributes.length; i++) {
    const attr = command.attributes.item(i);
    if (!attr || attr.name === "xmlns" || attr.name.startsWith("xmlns:")) continue;
    node.setAttribute(attr.name, attr.value);
  }
  for (let i = 0; i < command.childNodes.length; i++) {
    const child = command.childNodes.item(i);
    if (child) node.appendChild(doc.importNode(child, true));
  }
  return node;
}

function readSpec(node: XmlElement, kind: FindKind): FindSpec {
  const nameDefault = kind === "findName";
  return {
    reverse: boolAttr(node, "reverse", nameDefault),
    start: Math.max(0, intAttr(node, "start", 0)),
    limit: intAttr(node, "limit", nameDefault ? 1 : -1),
    panic: boolAttr(node, "panic", false),
  };
}

function take(matches: XmlElement[], spec: FindSpec): XmlElement[] {
  const ordered = spec.reverse ? [...matches].reverse() : matches;
  const skipped = ordered.slice(spec.start);
  return spec.limit < 0 ? skipped : skipped.slice(0, spec.limit);
}

function commandNodes(node: XmlElement): XmlElement[] {
  return elementChildren(node).filter(
    (child) => child.tagName !== "mod:selector" && child.tagName !== "mod:par",
  );
}

/** Slipstream's getContent returns the context node's element children. The top-level context is the document root. */
function searchScope(root: XmlElement): XmlElement[] {
  return elementChildren(root);
}

function findKind(tag: string): FindKind | undefined {
  if (tag === "mod:findName") return "findName";
  if (tag === "mod:findLike") return "findLike";
  if (tag === "mod:findWithChildLike") return "findWithChildLike";
  if (tag === "mod:findComposite") return "findComposite";
  return undefined;
}

function prefixOf(tag: string): string {
  const colon = tag.indexOf(":");
  return colon <= 0 ? "" : tag.slice(0, colon);
}

function localName(tag: string): string {
  const colon = tag.indexOf(":");
  return colon <= 0 ? tag : tag.slice(colon + 1);
}

function describe(node: XmlElement): string {
  const bits = [node.tagName];
  for (const key of ["type", "name", "child-type"]) {
    const value = node.getAttribute(key);
    if (value != null) bits.push(`${key}="${value}"`);
  }
  return bits.join(" ");
}

function boolAttr(node: XmlElement, name: string, fallback: boolean): boolean {
  const value = node.getAttribute(name);
  if (value == null) return fallback;
  return value === "true";
}

function intAttr(node: XmlElement, name: string, fallback: number): number {
  const value = node.getAttribute(name);
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ownText(node: XmlElement): string {
  let text = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (!child) continue;
    if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
      text += child.nodeValue ?? "";
    }
  }
  return text;
}

function elementChildren(node: XmlElement): XmlElement[] {
  const found: XmlElement[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (child?.nodeType === Node.ELEMENT_NODE) found.push(child as XmlElement);
  }
  return found;
}

function readXml(xml: string, path: string): XmlDocument {
  const parser = new DOMParser({
    xmlns: slipstreamXmlns(xml),
    onError(level, message) {
      throw new Error(`${level}: ${message}`);
    },
  });
  try {
    const doc = parser.parseFromString(xml, "text/xml");
    if (!doc.documentElement) throw new Error("the document has no root element");
    return doc;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`${path}: ${detail}`);
  }
}

/** Find wording in the source. `anchor` is a stable name; `line` is where that wording sits. */

export type CiteKind = "copy" | "comment" | "test" | "marker";

export type Cite = {
  file: string;
  anchor: string;
  /** 1-based line of the wording. Never a choice index. */
  line: number;
  kind: CiteKind;
  /** i18n key, when the phrase is a translation value. */
  key?: string;
  /** Heading after `#` in `[[Page#Section]]`. The reader scrolls within that section. */
  section?: string;
  /** A `> "…" — [[Page]]` quotation. Stripped before the index is written. */
  pinned?: true;
};

export type Sighting = {
  phrase: string;
  pages: string[];
  cite: Cite;
};

const CHOICE = /^(?:c|qa|q):[a-z0-9-]+(?::[a-z0-9-]+)+$/i;

export function normTitle(s: string): string {
  return s.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

type Frame = {
  fn: string | null;
  binding: string | null;
  pages: string[];
  slug: string | null;
  choice: string | null;
};

function isChoice(s: string): boolean {
  return CHOICE.test(s);
}

function usable(phrase: string, scoped: boolean): boolean {
  const n = phrase.replace(/\s+/g, " ").trim();
  if (n.length < (scoped ? 8 : 40)) return false;
  if (n.includes("{{")) return false;
  if (!n.includes(" ") && n.length < (scoped ? 16 : 40)) return false;
  if (/^(?:c|qa|q|cited):/.test(n)) return false;
  if (n.startsWith("wiki.") || n.startsWith("src/") || n.startsWith("./") || n.startsWith("@/") || n.startsWith("node:")) return false;
  if (/^[\w./:-]+$/.test(n)) return false;
  return true;
}

function pieces(phrase: string): string[] {
  const clean = phrase.replace(/\s+/g, " ").trim();
  if (clean.length < 80) return [clean];
  const parts = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s !== clean);
  return [clean, ...parts.slice(0, 12)];
}

/**
 * Walk one source file. `titleByNorm` maps a loosened title (lowercase, hyphens as spaces)
 * to the dump's title. `i18n` maps a `tx` key to its English value.
 */
export function scanSource(file: string, src: string, titleByNorm: Map<string, string>, i18n: Map<string, string>): Sighting[] {
  const out: Sighting[] = [];
  const baseKind: CiteKind = file.endsWith(".test.ts") || file.endsWith(".test.tsx") ? "test" : "copy";
  const frames: Frame[] = [{ fn: null, binding: null, pages: [], slug: null, choice: null }];
  let pendingFn: string | null = null;
  let pendingBinding: string | null = null;
  let pendingChoice: string | null = null;
  let pendingPage: string | null = null;
  let commentPage: string | null = null;
  let lastIdent: string | null = null;
  let colonField: string | null = null;
  let call: string | null = null;
  let callAt = 0;
  let callDepth = 0;
  let callArgs: string[] = [];
  let i = 0;
  let prev: "op" | "expr" = "op";

  const lineStarts = [0];
  for (let p = 0; p < src.length; p++) if (src[p] === "\n") lineStarts.push(p + 1);
  function lineNo(pos: number): number {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid]! <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  const top = () => frames[frames.length - 1]!;

  function pagesOf(): string[] {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const f of frames) {
      for (const p of f.pages) {
        if (seen.has(p)) continue;
        seen.add(p);
        list.push(p);
      }
    }
    if (pendingPage && !seen.has(pendingPage)) list.push(pendingPage);
    return list;
  }

  function anchorOf(): string {
    if (pendingChoice && isChoice(pendingChoice)) return pendingChoice;
    for (let n = frames.length - 1; n >= 0; n--) if (frames[n]!.choice) return frames[n]!.choice!;
    for (let n = frames.length - 1; n >= 0; n--) if (frames[n]!.slug) return frames[n]!.slug!;
    if (pendingFn) return pendingFn;
    for (let n = frames.length - 1; n >= 0; n--) if (frames[n]!.fn) return frames[n]!.fn!;
    if (pendingBinding) return pendingBinding;
    for (let n = frames.length - 1; n >= 0; n--) if (frames[n]!.binding) return frames[n]!.binding!;
    return "file";
  }

  function add(phrase: string, pages: string[], kind: CiteKind, at: number, key?: string) {
    const scoped = pages.length > 0;
    for (const piece of pieces(phrase)) {
      if (!usable(piece, scoped)) continue;
      out.push({
        phrase: piece,
        pages: [...pages],
        cite: { file, anchor: anchorOf(), line: lineNo(at), kind, ...(key ? { key } : {}) },
      });
    }
  }

  function titleOf(name: string): string | null {
    return titleByNorm.get(name.trim().toLowerCase()) ?? titleByNorm.get(normTitle(name)) ?? null;
  }

  function pageFromChoice(id: string): string | null {
    const m = /^(?:c|qa|q):([a-z0-9-]+):\d+$/i.exec(id);
    return m ? (titleByNorm.get(normTitle(m[1]!)) ?? null) : null;
  }

  function finishCall() {
    if (call === "wikiCite" && callArgs.length >= 2) {
      const page = titleOf(callArgs[0]!) ?? null;
      const phrase = callArgs[1]!.replace(/\s+/g, " ").trim();
      const explicit = callArgs[2];
      if (usable(phrase, true)) {
        out.push({
          phrase,
          pages: page ? [page] : pagesOf(),
          cite: { file, anchor: explicit || anchorOf(), line: lineNo(callAt), kind: "marker" },
        });
      }
    }
    call = null;
    callArgs = [];
    callDepth = 0;
  }

  function takeString(value: string, at: number) {
    const gap = src.slice(i).match(/^\s*/)![0];
    const after = src[i + gap.length];
    if (after === ":") {
      if (isChoice(value)) {
        pendingChoice = value;
        pendingPage = pageFromChoice(value);
      }
      return;
    }
    if (call && callDepth >= 1) {
      callArgs.push(value);
      if (call === "tx" || call === "t") {
        const text = i18n.get(value);
        if (text) add(text, pagesOf(), baseKind, at, value);
      } else if (call === "wikiPage") {
        const page = titleOf(value);
        if (page && !top().pages.includes(page)) top().pages.push(page);
      }
      return;
    }
    const field = colonField;
    if (field === "id" || field === "slug" || field === "dest" || field === "page" || field === "name" || field === "aliases") {
      if (field !== "aliases") colonField = null;
      if (field === "id") {
        // A resource id such as "fuel" is not an event. Only a choice id names a page.
        if (isChoice(value)) {
          top().choice = value;
          const page = pageFromChoice(value);
          if (page && !top().pages.includes(page)) top().pages.push(page);
        }
        return;
      }
      if (field === "slug") {
        top().slug = value;
        const page = titleByNorm.get(normTitle(value));
        if (page && !top().pages.includes(page)) top().pages.push(page);
        return;
      }
      const page = titleOf(value);
      if (page && !top().pages.includes(page)) top().pages.push(page);
      if (page && field !== "name") return;
    }
    add(value, pagesOf(), baseKind, at);
  }

  function absorbComment(body: string, at: number) {
    const kind: CiteKind = baseKind === "test" ? "test" : "comment";
    let offset = 0;
    for (const raw of body.split("\n")) {
      const here = at + 2 + offset;
      offset += raw.length + 1;
      const line = raw.trim();
      if (/^Wiki citations:\s*$/.test(line)) continue;
      const pin = /^>\s*"((?:[^"\\]|\\.)*)"\s*\u2014\s*\[\[([^\]#]+?)(?:#([^\]]+))?\]\]\s*$/.exec(line);
      if (pin) {
        const phrase = pin[1]!.replace(/\\(.)/g, "$1").replace(/\s+/g, " ").trim();
        const rawTitle = pin[2]!.replace(/\s+/g, " ").trim();
        const section = pin[3]?.replace(/\s+/g, " ").trim() || undefined;
        const page = titleOf(rawTitle) ?? rawTitle;
        // A pinned label is intentional, so a one-word button such as "Decline." still counts.
        if (phrase.length >= 8 && !phrase.includes("{{") && !/^(?:c|qa|q|cited):/.test(phrase) && !phrase.startsWith("wiki.")) {
          out.push({
            phrase,
            pages: [page],
            cite: { file, anchor: anchorOf(), line: lineNo(here), kind, ...(section ? { section } : {}), pinned: true },
          });
        }
        continue;
      }
      const named = /^(.*?)\bpage\s*:\s*"([^"]+)"/.exec(line);
      if (named) {
        const who = named[1]!.replace(/["']$/g, "").trim();
        const quote = named[2]!.trim();
        const page = /^same$/i.test(who) || who === "" ? commentPage : titleOf(who);
        if (page) commentPage = page;
        add(quote, page ? [page] : pagesOf(), kind, here);
        continue;
      }
      for (const q of line.match(/"([^"]{12,})"/g) ?? []) add(q.slice(1, -1), commentPage ? [commentPage] : pagesOf(), kind, here);
    }
  }

  while (i < src.length) {
    const c = src[i]!;
    if (c === "/" && src[i + 1] === "/") {
      const at = i;
      const end = src.indexOf("\n", i);
      absorbComment(src.slice(i + 2, end < 0 ? src.length : end), at);
      i = end < 0 ? src.length : end;
      prev = "op";
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const at = i;
      const end = src.indexOf("*/", i + 2);
      absorbComment(src.slice(i + 2, end < 0 ? src.length : end), at);
      i = end < 0 ? src.length : end + 2;
      prev = "op";
      continue;
    }
    if (c === "'" || c === '"') {
      const at = i;
      let s = "";
      const q = c;
      i++;
      while (i < src.length) {
        const d = src[i]!;
        if (d === "\\") {
          const n = src[i + 1];
          s += n === "n" ? "\n" : n === "t" ? "\t" : (n ?? "");
          i += 2;
          continue;
        }
        if (d === q) {
          i++;
          break;
        }
        s += d;
        i++;
      }
      takeString(s, at);
      prev = "expr";
      continue;
    }
    if (c === "`") {
      const at = i;
      let s = "";
      let depth = 0;
      let interp = false;
      i++;
      while (i < src.length) {
        const d = src[i]!;
        if (d === "\\") {
          s += src[i + 1] ?? "";
          i += 2;
          continue;
        }
        if (d === "`" && depth === 0) {
          i++;
          break;
        }
        if (d === "$" && src[i + 1] === "{") {
          interp = true;
          depth++;
          i += 2;
          continue;
        }
        if (d === "{" && depth > 0) {
          depth++;
          i++;
          continue;
        }
        if (d === "}" && depth > 0) {
          depth--;
          i++;
          continue;
        }
        if (depth === 0) s += d;
        i++;
      }
      if (!interp) add(s, pagesOf(), baseKind, at);
      prev = "expr";
      continue;
    }
    if (c === "/" && prev === "op") {
      i++;
      let klass = false;
      while (i < src.length) {
        const d = src[i]!;
        if (d === "\\") {
          i += 2;
          continue;
        }
        if (d === "[") klass = true;
        else if (d === "]") klass = false;
        else if (d === "/" && !klass) {
          i++;
          while (i < src.length && /[a-z]/i.test(src[i]!)) i++;
          break;
        } else if (d === "\n") break;
        i++;
      }
      prev = "expr";
      continue;
    }
    if (c === "{") {
      const parent = top();
      if (pendingFn) commentPage = null;
      frames.push({
        fn: pendingFn ?? parent.fn,
        binding: pendingBinding ?? parent.binding,
        pages: pendingPage ? [pendingPage] : [],
        slug: null,
        choice: pendingChoice && isChoice(pendingChoice) ? pendingChoice : null,
      });
      pendingFn = null;
      pendingBinding = null;
      pendingChoice = null;
      pendingPage = null;
      if (call) callDepth++;
      i++;
      prev = "op";
      continue;
    }
    if (c === "}") {
      if (frames.length > 1) frames.pop();
      pendingFn = null;
      pendingBinding = null;
      if (call) {
        callDepth--;
        if (callDepth <= 0) finishCall();
      }
      i++;
      prev = "expr";
      continue;
    }
    if (c === "(") {
      if (call) callDepth++;
      i++;
      prev = "op";
      continue;
    }
    if (c === ")") {
      if (call) {
        callDepth--;
        if (callDepth <= 0) finishCall();
      }
      i++;
      prev = "expr";
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const start = i;
      i++;
      while (i < src.length && /[\w$]/.test(src[i]!)) i++;
      const word = src.slice(start, i);
      if (word === "function" || word === "class") {
        const name = /^\s*([A-Za-z_$][\w$]*)/.exec(src.slice(i));
        if (name) {
          pendingFn = name[1]!;
          pendingBinding = null;
        }
      } else if (word === "const" || word === "let" || word === "var") {
        const name = /^\s*([A-Za-z_$][\w$]*)/.exec(src.slice(i));
        if (name) pendingBinding = name[1]!;
      } else if (word === "tx" || word === "wikiCite" || word === "wikiPage") {
        call = word;
        callAt = start;
        callArgs = [];
        callDepth = 0;
      } else if (word === "t" && lastIdent === "i18n") {
        call = "t";
        callAt = start;
        callArgs = [];
        callDepth = 0;
      }
      lastIdent = word;
      colonField = null;
      prev = "expr";
      continue;
    }
    if (c === ":") colonField = lastIdent && /^(?:id|slug|dest|page|name|aliases)$/.test(lastIdent) ? lastIdent : null;
    else if (c === "]") colonField = null;
    else if (!/\s/.test(c) && c !== "," && c !== "[") colonField = null;
    i++;
    if (!/\s/.test(c)) prev = c === ")" || c === "]" ? "expr" : "op";
  }
  return out;
}

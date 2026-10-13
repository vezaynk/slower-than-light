/** A readable subset of the wiki's wikitext: prose, lists, tables, links, and the templates that carry rules. */

export type Inline =
  | { k: "t"; s: string }
  | { k: "b"; in: Inline[] }
  | { k: "i"; in: Inline[] }
  | { k: "a"; page: string; hash?: string; in: Inline[] }
  | { k: "x"; href: string; s: string }
  | { k: "f"; name: string; alt: string }
  | { k: "tip"; s: string; tip: string }
  | { k: "c"; color: string; in: Inline[] }
  | { k: "br" }
  | { k: "ref"; n: number };

export type Block =
  | { k: "h"; n: number; in: Inline[] }
  | { k: "p"; in: Inline[] }
  | { k: "li"; depth: number; mark: "#" | "*" | ":" | ";"; in: Inline[] }
  | { k: "tb"; rows: { head: boolean; cells: Inline[][] }[] }
  | { k: "hr" }
  | { k: "pre"; s: string };

export type Doc = { blocks: Block[]; cats: string[]; notes: { n: number; in: Inline[] }[] };

const NAMED: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Fold `s` to the wording a cite matches on: curly quotes become straight, and
 * whitespace collapses. `map[i]` is the index of folded character `i` in `s`.
 */
export function fold(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let space = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    const c = ch === "\u2019" || ch === "\u2018" ? "'" : ch === "\u201c" || ch === "\u201d" ? '"' : ch;
    if (/\s/u.test(ch) || ch === "\u00a0") {
      if (space || text.length === 0) continue;
      text += " ";
      map.push(i);
      space = true;
    } else {
      text += c;
      map.push(i);
      space = false;
    }
  }
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    map.pop();
  }
  return { text, map };
}

/** Collapse whitespace and curly quotes so a code string can meet the wiki's wording. */
export function norm(s: string): string {
  return fold(s).text;
}

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, body: string) => {
    if (body[0] === "#") {
      const n = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : all;
    }
    return NAMED[body.toLowerCase()] ?? all;
  });
}

function cut(inner: string, open: string, close: string, sep: string): string[] {
  const parts: string[] = [];
  let depthC = 0;
  let depthS = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner.startsWith(open, i)) {
      depthC++;
      i += open.length - 1;
      continue;
    }
    if (inner.startsWith(close, i)) {
      depthC = Math.max(0, depthC - 1);
      i += close.length - 1;
      continue;
    }
    if (inner.startsWith("[[", i)) {
      depthS++;
      i++;
      continue;
    }
    if (inner.startsWith("]]", i) && open !== "[[") {
      depthS = Math.max(0, depthS - 1);
      i++;
      continue;
    }
    if (inner[i] === sep && depthC === 0 && depthS === 0) {
      parts.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(inner.slice(start));
  return parts;
}

function matchEnd(src: string, i: number, open: string, close: string): number {
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src.startsWith(open, j)) {
      depth++;
      j += open.length - 1;
      continue;
    }
    if (src.startsWith(close, j)) {
      depth--;
      if (depth === 0) return j;
      j += close.length - 1;
    }
  }
  return -1;
}

type Args = { pos: string[]; named: Record<string, string> };

function argsOf(raw: string[]): Args {
  const pos: string[] = [];
  const named: Record<string, string> = {};
  for (const a of raw) {
    const eq = a.indexOf("=");
    const key = eq > 0 ? a.slice(0, eq).trim() : "";
    if (eq > 0 && /^[\w /-]+$/.test(key)) named[key] = a.slice(eq + 1).trim();
    else if (a.trim()) pos.push(a.trim());
  }
  return { pos, named };
}

function p(pos: string[], n: number): string {
  return pos[n - 1] ?? "";
}

const TX: Record<string, string> = {
  subtract_missiles: "Missiles lost",
  subtract_drones: "Drone parts lost",
  subtract_fuel: "Fuel lost",
  subtract_scrap: "Scrap lost",
  add_missiles: "Missiles gained",
  add_drones: "Drone parts gained",
  add_fuel: "Fuel gained",
  add_scrap: "Scrap gained",
};

function hullTip(shown: string, actual: string): string {
  if (!shown) return "";
  const tip = actual ? ` (in-game value may be ${actual} hull, plus more as the sector advances)` : "";
  return `${shown}% hull${tip}`;
}

function applyTemplate(name: string, rawArgs: string[]): string {
  const key = name.trim().toLowerCase().replace(/_/g, " ");
  const { pos, named } = argsOf(rawArgs.map((a) => a.trim()));
  if (key === "blue option") {
    const req = named.shortreq || p(pos, 1);
    const level = named.level ? ` (Requires level ${named.level} ${req})` : "";
    return `<span style="color:#09f">(${p(pos, 1)}) ${p(pos, 2)}${level}</span>`;
  }
  if (key === "winning") {
    const labels = [
      named.deadCrew != null && named.deadCrew !== "" ? "After killing enemy crew" : "",
      named.destroyed != null && named.destroyed !== "" ? "After destroying enemy ship" : "",
      named.surrender != null && named.surrender !== "" ? "When the ship surrenders" : "",
      named.escape != null && named.escape !== "" ? "When the ship wants to escape" : "",
      named.gotaway != null && named.gotaway !== "" ? "After the ship successfully escaped" : "",
      named["destroyed/deadCrew"] != null && named["destroyed/deadCrew"] !== ""
        ? "After destroying enemy ship or after killing enemy crew"
        : "",
    ].filter(Boolean);
    const lead = labels.length ? `'''${labels.join("; ")}''' ` : "";
    return p(pos, 1) ? `${lead}''${p(pos, 1)}''` : lead;
  }
  if (key === "transaction") {
    const kind = p(pos, 2);
    return `${TX[kind] ?? kind}: ${p(pos, 1)}`;
  }
  if (key === "tooltip") return `{{tip|${p(pos, 1)}|${p(pos, 2)}}}`;
  if (key === "duplicateevent") return `${p(pos, 1)}×`;
  if (key === "clr") return "\n";
  if (key === "advanced edition content") {
    return `This ${named.section ? "section" : "page"} describes content that only appears in Advanced Edition.`;
  }
  if (key === "locations") {
    const sectors = pos.map((s) => `[[${s}]]`).join(", ");
    let s = sectors ? `This random event occurs in ${sectors}.` : "This random event occurs.";
    if (named.unique === "true") s += " It is unique.";
    if (named.all === "true") s += " It occurs in all standard sectors.";
    if (named.LRSmap) s += ` Long-ranged scanners on the map: ${named.LRSmap}.`;
    return s;
  }
  if (key === "long-ranged scanners info") {
    const mode = named.shipdetected || p(pos, 1);
    const presence = /noship/i.test(mode) ? "no ship presence" : /ship/i.test(mode) ? "ship presence" : mode;
    const hazard = /redgiant/i.test(mode)
      ? "Beacon coordinates appear to be very close to a nearby sun. "
      : /pulsar/i.test(mode)
        ? "A pulsar is flooding this area with dangerous electromagnetic forces. "
        : /plasmastorm/i.test(mode)
          ? "This section of the nebula is experiencing an ion storm. "
          : /asteroid/i.test(mode)
            ? "Asteroid field detected in this location. "
            : /pds/i.test(mode)
              ? "Planet-side anti-ship batteries are detected in this system. "
              : "";
    return `The Long-Ranged Scanners will detect ${hazard}${presence}.`;
  }
  if (key === "reward") {
    const type = (named.type || "standard").replace(/\s/g, "");
    const amount = named.amount || p(pos, 1) || "low";
    const table: Record<string, string> = {
      standard: `'''${amount}''' scrap with low resources`,
      stuff: `'''${amount}''' resources with low scrap`,
      scrap_only: `'''${amount}''' scrap`,
      fuel: `'''${amount}''' scrap with ${amount} fuel`,
      missiles: `'''${amount}''' scrap with ${amount} missiles`,
      fuel_only: `${amount} fuel`,
      weapon: `a weapon with ${amount} scrap`,
      augment: `an augment with ${amount} scrap`,
      drone: `a drone with ${amount} scrap`,
    };
    return `You receive ${table[type] ?? `${amount} ${type}`}.`;
  }
  if (key === "fuel") return `${p(pos, 1)} fuel`;
  if (key === "missiles") return `${p(pos, 1)} missiles`;
  if (key === "surrenderescape" || key === "surrenderescape(alt)") return surrender(key.endsWith("(alt)"), pos);
  if (key === "categorytemplate" || key === "documentation" || key === "reflist") return "";
  if (key.startsWith("#")) return pos.filter(Boolean).join(" ");
  const visible = [...pos, ...Object.values(named)].filter((s) => s && !/^https?:/i.test(s)).join(" ");
  return visible;
}

function surrender(alt: boolean, pos: string[]): string {
  const mode = p(pos, 1);
  if (!alt) {
    const grey = (s: string) => s;
    if (mode === "surrender") return grey(`(surrender offer: ${p(pos, 4)}% chance at ${hullTip(p(pos, 5), p(pos, 6))})`);
    if (mode === "surrender2") return grey(`(surrender offer at ${hullTip(p(pos, 4), p(pos, 5))})`);
    if (mode === "surrender3") return grey(`(forced surrender at ${hullTip(p(pos, 4), p(pos, 5))})`);
    if (mode === "surrenderno") return grey("(no surrender offers)");
    if (mode === "escape") return grey(`(escape attempt: ${p(pos, 4)}% chance at ${hullTip(p(pos, 5), p(pos, 6))})`);
    if (mode === "escape2") return grey(`(escape attempt at ${hullTip(p(pos, 4), p(pos, 5))})`);
    if (mode === "escape3") return grey("(immediately starts to escape)");
    if (mode === "timer") return grey(`(${p(pos, 2)} seconds escape countdown timer if not interrupted)`);
    if (mode === "escapeno") return grey("(no escape attempts)");
    if (mode === "surrender+escape") {
      return grey(
        `(surrender offer: ${p(pos, 4)}% chance at ${hullTip(p(pos, 5), p(pos, 6))}; escape attempt: ${p(pos, 7)}% chance at ${hullTip(p(pos, 8), p(pos, 9))})`,
      );
    }
    if (mode === "surrenderno+escapeno") return grey("(no surrender offers, no escape attempts)");
    if (mode === "verify") return grey("(no surrender or escape information for this ship in the data files)");
    return grey(pos.slice(1).join(" "));
  }
  const ship = [p(pos, 2), p(pos, 3)].filter(Boolean).join(", ");
  const who = ship ? `The enemy ship (${ship})` : "The enemy ship";
  if (mode === "escape+surrender") {
    return `${who}: ${p(pos, 4)}% chance for escape attempt at ${hullTip(p(pos, 5), p(pos, 6))} and/or ${p(pos, 7)}% chance for surrender offer at ${hullTip(p(pos, 8), p(pos, 9))}. The enemy does not run if the surrender was offered first.`;
  }
  if (mode === "escape+surrender*") return `${who}: ${p(pos, 4)}.`;
  if (mode === "no") return `${who}: never runs away, never surrenders.`;
  if (mode === "surrenderofferchance" || mode === "surrenderofferchance*") {
    return `${who}: ${p(pos, 4)}% chance for surrender offer at ${hullTip(p(pos, 5), p(pos, 6))}.`;
  }
  if (mode === "surrenderofferchance100") return `${who}: makes a surrender offer at ${hullTip(p(pos, 4), p(pos, 5))}.`;
  if (mode === "autosurrender") return `${who}: auto-surrenders at ${hullTip(p(pos, 4), p(pos, 5))}.`;
  if (mode === "escapechance") return `${who}: ${p(pos, 4)}% chance for escape attempt at ${hullTip(p(pos, 5), p(pos, 6))}.`;
  if (mode === "escapechance100") return `${who}: attempts to escape at ${hullTip(p(pos, 4), p(pos, 5))}.`;
  if (mode === "escapechance100timer") return `${who}: attempts to escape at ${hullTip(p(pos, 4), p(pos, 5))} (${p(pos, 6)} seconds timer).`;
  if (mode === "escapestart") return `${who}: immediately starts to escape (${p(pos, 4)} seconds timer).`;
  return `${who}: ${pos.slice(3).filter(Boolean).join(" ")}`;
}

function expandTemplates(src: string): string {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    if (src.startsWith("{{", i) && !src.startsWith("{{tip|", i)) {
      const end = matchEnd(src, i, "{{", "}}");
      if (end < 0) {
        out += src[i];
        continue;
      }
      const inner = src.slice(i + 2, end);
      const parts = cut(inner, "{{", "}}", "|");
      const name = parts[0] ?? "";
      const args = parts.slice(1).map((a) => expandTemplates(a));
      out += applyTemplate(name, args);
      i = end + 1;
      continue;
    }
    out += src[i];
  }
  return out;
}

function maskNowiki(src: string): { text: string; slots: string[] } {
  const slots: string[] = [];
  const text = src.replace(/<nowiki>([\s\S]*?)<\/nowiki>/gi, (_all, inner: string) => {
    const token = `\u0000N${slots.length}\u0000`;
    slots.push(inner);
    return token;
  });
  return { text, slots };
}

function unmask(src: string, slots: string[]): string {
  return src.replace(/\u0000N(\d+)\u0000/g, (_a, n: string) => slots[Number(n)] ?? "");
}

/** Expand the templates a reader needs, and drop editor comments. */
export function expand(src: string): string {
  const noComments = src.replace(/<!--[\s\S]*?-->/g, "").replace(/__(?:NOTOC|TOC|FORCETOC|NOEDITSECTION)__/g, "");
  const { text, slots } = maskNowiki(noComments);
  // Fold a multiline <ref>…</ref> onto one line. The opener is a ">" that is not the
  // slash of a self-closing <ref …/>, so a later footnote cannot swallow the page.
  return unmask(expandTemplates(text), slots).replace(/<ref\b[^>]*?(?<!\/)>[\s\S]*?<\/ref>/gi, (m) => m.replace(/\s*\n\s*/g, " "));
}

const refs: { name?: string; in: Inline[] }[] = [];
let refCounter = 0;

function refNumber(name: string | undefined, body: Inline[] | null): number {
  if (name) {
    const prev = refs.findIndex((r) => r.name === name);
    if (prev >= 0) {
      if (body && refs[prev]!.in.length === 0) refs[prev]!.in = body;
      return prev + 1;
    }
  }
  refs.push({ name, in: body ?? [] });
  refCounter++;
  return refCounter;
}

function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (!text) return;
    out.push({ k: "t", s: decode(text) });
    text = "";
  };
  for (let i = 0; i < src.length; i++) {
    if (src.startsWith("{{tip|", i)) {
      const end = matchEnd(src, i, "{{", "}}");
      if (end > 0) {
        flush();
        const inner = src.slice(i + 2, end);
        const parts = cut(inner, "{{", "}}", "|").slice(1);
        out.push({ k: "tip", s: decode(parts[0] ?? ""), tip: decode(parts.slice(1).join("|")) });
        i = end + 1;
        continue;
      }
    }
    if (src.startsWith("'''", i)) {
      const end = src.indexOf("'''", i + 3);
      if (end > 0) {
        flush();
        out.push({ k: "b", in: parseInline(src.slice(i + 3, end)) });
        i = end + 2;
        continue;
      }
    }
    if (src.startsWith("''", i)) {
      const end = src.indexOf("''", i + 2);
      if (end > 0) {
        flush();
        out.push({ k: "i", in: parseInline(src.slice(i + 2, end)) });
        i = end + 1;
        continue;
      }
    }
    if (src.startsWith("[[", i)) {
      const end = matchEnd(src, i, "[[", "]]");
      if (end > 0) {
        flush();
        out.push(parseLink(src.slice(i + 2, end)));
        i = end + 1;
        continue;
      }
    }
    if (src[i] === "[" && /^https?:\/\//i.test(src.slice(i + 1, i + 10))) {
      const end = src.indexOf("]", i + 1);
      if (end > 0) {
        flush();
        const body = src.slice(i + 1, end);
        const sp = body.indexOf(" ");
        const href = sp < 0 ? body : body.slice(0, sp);
        const label = sp < 0 ? body : body.slice(sp + 1).trim();
        out.push({ k: "x", href, s: decode(label || href) });
        i = end;
        continue;
      }
    }
    if (/^<br\s*\/?\s*>/i.test(src.slice(i))) {
      flush();
      out.push({ k: "br" });
      i += /^<br\s*\/?\s*>/i.exec(src.slice(i))![0].length - 1;
      continue;
    }
    if (/^<ref\b/i.test(src.slice(i))) {
      const gt = src.indexOf(">", i);
      if (gt > 0) {
        const open = src.slice(i, gt + 1);
        const name = /name\s*=\s*"([^"]*)"/i.exec(open)?.[1] ?? /name\s*=\s*'([^']*)'/i.exec(open)?.[1];
        const self = /\/>\s*$/.test(open);
        flush();
        if (self) {
          out.push({ k: "ref", n: refNumber(name, null) });
          i = gt;
          continue;
        }
        const close = src.toLowerCase().indexOf("</ref>", gt);
        const body = close > 0 ? src.slice(gt + 1, close) : "";
        const inner = parseInline(body);
        out.push({ k: "ref", n: refNumber(name, inner) });
        i = close > 0 ? close + 5 : gt;
        continue;
      }
    }
    const span = /^<span\b([^>]*)>/i.exec(src.slice(i));
    if (span) {
      const close = src.toLowerCase().indexOf("</span>", i + span[0].length);
      if (close > 0) {
        flush();
        const color = /color\s*:\s*([^;"']+)/i.exec(span[1] ?? "")?.[1]?.trim() ?? "";
        const inner = parseInline(src.slice(i + span[0].length, close));
        if (color) out.push({ k: "c", color, in: inner });
        else out.push(...inner);
        i = close + 6;
        continue;
      }
    }
    if (/^<\/?[a-z][^>]*>/i.test(src.slice(i))) {
      const m = /^<\/?[a-z][^>]*>/i.exec(src.slice(i))!;
      // Keep the words inside unknown tags; the tag itself is chrome.
      i += m[0].length - 1;
      continue;
    }
    text += src[i];
  }
  flush();
  return out.flatMap((n) => (n.k === "t" && n.s === "" ? [] : [n]));
}

function parseLink(inner: string): Inline {
  const parts = cut(inner, "[[", "]]", "|");
  const target = (parts[0] ?? "").trim();
  const rest = parts.slice(1).map((s) => s.trim());
  if (/^(?:file|image):/i.test(target)) {
    const name = target.replace(/^(?:file|image):/i, "").trim();
    const alt =
      [...rest].reverse().find((p) => p && !/^\d+px$/i.test(p) && !/^(?:thumb|thumbnail|left|right|center|frameless|border|none)$/i.test(p)) ??
      "";
    return { k: "f", name, alt: decode(alt) };
  }
  if (/^category:/i.test(target)) return { k: "t", s: "" };
  const hashAt = target.indexOf("#");
  const page = (hashAt < 0 ? target : target.slice(0, hashAt)).trim();
  const hash = hashAt < 0 ? undefined : target.slice(hashAt + 1).trim();
  const label = rest.length ? rest.join("|") : page || hash || target;
  return { k: "a", page, hash, in: parseInline(label) };
}

function inlineText(nodes: Inline[]): string {
  let s = "";
  for (const n of nodes) {
    if (n.k === "t" || n.k === "x") s += n.s;
    else if (n.k === "tip") s += n.s;
    else if (n.k === "f") s += n.alt ? `${n.alt} (${n.name})` : n.name;
    else if (n.k === "br") s += "";
    else if (n.k === "ref") s += "";
    else if (n.k === "b" || n.k === "i" || n.k === "a" || n.k === "c") s += inlineText(n.in);
  }
  return s;
}

export function blockText(b: Block): string {
  if (b.k === "pre") return b.s;
  if (b.k === "hr") return "";
  if (b.k === "tb") return b.rows.map((r) => r.cells.map((c) => inlineText(c)).join(" ")).join(" ");
  return inlineText(b.in);
}

function pushPara(blocks: Block[], lines: string[]) {
  const body = lines.join(" ").trim();
  if (body) blocks.push({ k: "p", in: parseInline(body) });
  lines.length = 0;
}

function parseTable(lines: string[], start: number): { block: Block; next: number } {
  const rows: { head: boolean; cells: Inline[][] }[] = [];
  let cells: Inline[][] = [];
  let head = false;
  let buf = "";
  const flushCell = () => {
    cells.push(parseInline(buf.trim()));
    buf = "";
  };
  const flushRow = () => {
    if (buf.trim()) flushCell();
    if (cells.length) rows.push({ head, cells });
    cells = [];
    buf = "";
  };
  let i = start + 1;
  for (; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "|}") {
      flushRow();
      return { block: { k: "tb", rows }, next: i + 1 };
    }
    if (/^\|-\s*/.test(line)) {
      flushRow();
      head = false;
      continue;
    }
    const headLine = /^!(.*)$/.exec(line);
    const cellLine = /^\|(.*)$/.exec(line);
    if (headLine || cellLine) {
      if (buf.trim()) flushCell();
      head = Boolean(headLine) || head;
      const rest = (headLine ?? cellLine)![1] ?? "";
      const bits = rest.split(headLine ? /!!/ : /\|\|/);
      bits.forEach((bit, idx) => {
        const cleaned = bit.replace(/^(?:[^|\n]*\s)?(?:style|colspan|rowspan|class|align|width)\s*=[^|]*\|/, "");
        if (idx < bits.length - 1) {
          buf = cleaned;
          flushCell();
        } else buf = cleaned;
      });
      continue;
    }
    buf += ` ${line}`;
  }
  flushRow();
  return { block: { k: "tb", rows }, next: i };
}

/** Parse expanded wikitext into blocks. Safe on messy pages: a failure becomes one preformatted block. */
export function parseWiki(src: string): Doc {
  refs.length = 0;
  refCounter = 0;
  const cats: string[] = [];
  try {
    const expanded = expand(src);
    for (const m of expanded.matchAll(/\[\[Category:([^\]]+)\]\]/gi)) cats.push((m[1] ?? "").split("|")[0]!.trim());
    const lines = expanded.replace(/\r\n/g, "\n").split("\n");
    const blocks: Block[] = [];
    const para: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();
      if (trimmed === "") {
        pushPara(blocks, para);
        continue;
      }
      if (/^----+$/.test(trimmed)) {
        pushPara(blocks, para);
        blocks.push({ k: "hr" });
        continue;
      }
      const heading = /^(={1,6})(.+?)\1\s*$/.exec(trimmed);
      const htmlHeading = /^<h([1-6])\b[^>]*>([\s\S]*)<\/h\1>\s*$/i.exec(trimmed);
      if (heading || htmlHeading) {
        pushPara(blocks, para);
        const level = heading ? heading[1]!.length : Number(htmlHeading![1]);
        const inner = (heading ? heading[2] : htmlHeading![2]) ?? "";
        blocks.push({ k: "h", n: level, in: parseInline(inner.trim()) });
        continue;
      }
      if (trimmed.startsWith("{|")) {
        pushPara(blocks, para);
        const table = parseTable(lines, i);
        blocks.push(table.block);
        i = table.next - 1;
        continue;
      }
      if (/^<gallery\b/i.test(trimmed)) {
        pushPara(blocks, para);
        const gal: string[] = [];
        i++;
        for (; i < lines.length && !/^<\/gallery>/i.test(lines[i] ?? ""); i++) gal.push(lines[i] ?? "");
        for (const g of gal) {
          const [file, cap] = g.split("|");
          const name = (file ?? "").replace(/^(?:file|image):/i, "").trim();
          if (name) blocks.push({ k: "p", in: [{ k: "f", name, alt: decode((cap ?? "").trim()) }] });
        }
        continue;
      }
      const list = /^([*#:;]+)\s*(.*)$/.exec(line);
      if (list) {
        pushPara(blocks, para);
        const marks = list[1]!;
        const mark = marks[marks.length - 1] as "#" | "*" | ":" | ";";
        blocks.push({ k: "li", depth: marks.length, mark, in: parseInline(list[2] ?? "") });
        continue;
      }
      if (trimmed.startsWith("|}") || trimmed === "|-") continue;
      para.push(trimmed);
    }
    pushPara(blocks, para);
    const notes = refs.map((r, i) => ({ n: i + 1, in: r.in }));
    return { blocks, cats, notes };
  } catch {
    refs.length = 0;
    return { blocks: [{ k: "pre", s: src }], cats, notes: [] };
  }
}

/** The words a reader sees, whitespace-collapsed. Used to join a code phrase to a page. */
export function plainText(src: string): string {
  const doc = parseWiki(src);
  return norm(doc.blocks.map(blockText).filter(Boolean).join("\n"));
}

export function inlinePlain(nodes: Inline[]): string {
  return inlineText(nodes);
}

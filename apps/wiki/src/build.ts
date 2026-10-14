/**
 * Build the parity index: each wiki phrase the implementation uses, cited as `file#anchor`.
 * Run with `pnpm --filter @stl/wiki parity`. The reader loads `public/parity.json`.
 * Cite paths stay relative to the game package (`src/game/...`).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type Cite, type Sighting, normTitle, scanSource } from "./scan.ts";
import { norm, placeBlocks, plainText, type PlacedBlock, warnPlaced } from "./wikitext.ts";

export type PhraseCite = { phrase: string; cites: Cite[] };
export type PageCites = { hits: PhraseCite[]; gaps: PhraseCite[] };
export type Parity = {
  built: string;
  stats: { hits: number; gaps: number; pagesWithHits: number };
  pages: Record<string, PageCites>;
};

type Row = { title: string; ns?: number; text?: string; redirect?: string };

const HERE = dirname(fileURLToPath(import.meta.url));
const WIKI_ROOT = join(HERE, "..");
const GAME_ROOT = join(WIKI_ROOT, "../game");
const GAME_SRC = join(GAME_ROOT, "src");
const OUT = join(WIKI_ROOT, "public/parity.json");

function dumpFile(): string {
  return fileURLToPath(import.meta.resolve("@stl/wiki-dump/pages.jsonl"));
}

function loadEn(): Record<string, unknown> {
  const path = join(GAME_SRC, "i18n/en.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

const KIND_RANK: Record<Cite["kind"], number> = { marker: 0, copy: 1, comment: 2, test: 3 };

function loadDump(): { rows: Row[]; canonical: Map<string, string>; plain: Map<string, string>; texts: Map<string, string> } {
  const byTitle = new Map<string, Row>();
  for (const line of readFileSync(dumpFile(), "utf8").split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as Row;
    byTitle.set(row.title, row);
  }
  const resolving = new Set<string>();
  function canonical(title: string): string {
    if (resolving.has(title)) return title;
    resolving.add(title);
    const row = byTitle.get(title);
    const next = row?.redirect?.split("#")[0];
    const out = next && next !== title ? canonical(next) : title;
    resolving.delete(title);
    return out;
  }
  const titleByNorm = new Map<string, string>();
  const articles = [...byTitle.values()].filter((r) => (r.ns ?? 0) === 0);
  articles.sort((a, b) => Number(Boolean(b.text)) - Number(Boolean(a.text)));
  for (const row of articles) {
    const can = canonical(row.title);
    const key = normTitle(row.title);
    if (!titleByNorm.has(key)) titleByNorm.set(key, can);
    const lower = row.title.toLowerCase();
    if (!titleByNorm.has(lower)) titleByNorm.set(lower, can);
  }
  const plain = new Map<string, string>();
  const texts = new Map<string, string>();
  for (const row of articles) {
    if (!row.text) continue;
    const can = canonical(row.title);
    if (!plain.has(can)) {
      plain.set(can, norm(plainText(row.text)));
      texts.set(can, row.text);
    }
  }
  return { rows: articles, canonical: titleByNorm, plain, texts };
}

function walk(dir: string, out: string[]) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "wiki-explorer" || ent.name === "dump") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith(".d.ts")) out.push(p);
  }
}

function storedCite(cite: Cite): Cite {
  const out: Cite = { file: cite.file, anchor: cite.anchor, line: cite.line, kind: cite.kind };
  if (cite.key) out.key = cite.key;
  if (cite.section) out.section = cite.section;
  return out;
}

function citeSig(cite: Cite): string {
  return `${cite.file}#${cite.anchor}#${cite.line}#${cite.kind}#${cite.key ?? ""}#${cite.section ?? ""}`;
}

function mergeCite(list: Cite[], cite: Cite) {
  const next = storedCite(cite);
  const sig = citeSig(next);
  if (list.some((c) => citeSig(c) === sig)) return;
  list.push(next);
  list.sort(
    (a, b) =>
      KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      (a.section ?? "").localeCompare(b.section ?? ""),
  );
  if (list.length > 8) list.length = 8;
}

function citationReport(sightings: Sighting[], texts: Map<string, string>, canonical: Map<string, string>): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const placed = new Map<string, PlacedBlock[]>();
  for (const s of sightings) {
    if (!s.cite.pinned) continue;
    for (const title of s.pages) {
      const can = canonical.get(normTitle(title)) ?? canonical.get(title.toLowerCase()) ?? title;
      const where = `${s.cite.file}#${s.cite.anchor}`;
      const label = s.cite.section ? `[[${can}#${s.cite.section}]]` : `[[${can}]]`;
      const key = `${where}|${label}|${norm(s.phrase)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const text = texts.get(can);
      if (text == null) {
        warnings.push(`${where}: ${label} is not a page — "${s.phrase}"`);
        continue;
      }
      let blocks = placed.get(can);
      if (!blocks) placed.set(can, (blocks = placeBlocks(text)));
      const why = warnPlaced(blocks, s.phrase, s.cite.section);
      if (why) warnings.push(`${where}: ${label} ${why} — "${s.phrase}"`);
    }
  }
  return warnings;
}

export function buildParity(): { parity: Parity; warnings: string[] } {
  const { canonical, plain, texts } = loadDump();
  const i18n = new Map<string, string>();
  for (const [key, value] of Object.entries(loadEn())) if (typeof value === "string") i18n.set(key, value);

  const files: string[] = [];
  if (existsSync(GAME_SRC)) walk(GAME_SRC, files);
  const sightings: Sighting[] = [];
  for (const file of files) {
    const rel = relative(GAME_ROOT, file);
    sightings.push(...scanSource(rel, readFileSync(file, "utf8"), canonical, i18n));
  }

  const wordPages = new Map<string, string[]>();
  for (const [title, hay] of plain) {
    const seen = new Set<string>();
    for (const w of hay.split(" ")) {
      if (w.length < 8 || seen.has(w)) continue;
      seen.add(w);
      const arr = wordPages.get(w);
      if (arr) arr.push(title);
      else wordPages.set(w, [title]);
    }
  }

  const hits = new Map<string, Map<string, Cite[]>>();
  const gaps = new Map<string, Map<string, Cite[]>>();

  function bucket(map: Map<string, Map<string, Cite[]>>, title: string, phrase: string, cite: Cite) {
    let page = map.get(title);
    if (!page) map.set(title, (page = new Map()));
    const key = norm(phrase);
    let list = page.get(key);
    if (!list) page.set(key, (list = []));
    mergeCite(list, cite);
  }

  function occurs(title: string, phrase: string): boolean {
    const hay = plain.get(title);
    return !!hay && hay.includes(norm(phrase));
  }

  for (const s of sightings) {
    const phrase = s.phrase;
    if (s.pages.length) {
      let any = false;
      for (const title of s.pages) {
        const can = canonical.get(normTitle(title)) ?? title;
        if (!plain.has(can)) continue;
        if (occurs(can, phrase)) {
          bucket(hits, can, phrase, s.cite);
          any = true;
        }
      }
      if (!any && norm(phrase).length >= 24 && s.cite.kind !== "test") {
        for (const title of s.pages) {
          const can = canonical.get(normTitle(title)) ?? title;
          if (plain.has(can)) bucket(gaps, can, phrase, s.cite);
        }
      }
      continue;
    }
    if (norm(phrase).length < 40) continue;
    const words = norm(phrase)
      .split(" ")
      .filter((w) => w.length >= 8)
      .sort((a, b) => b.length - a.length);
    const rare = words.find((w) => (wordPages.get(w)?.length ?? 0) <= 40) ?? words[0];
    if (!rare) continue;
    const candidates = wordPages.get(rare) ?? [];
    if (candidates.length === 0 || candidates.length > 40) continue;
    const found = candidates.filter((title) => occurs(title, phrase));
    if (found.length >= 1 && found.length <= 4) for (const title of found) bucket(hits, title, phrase, s.cite);
  }

  const pages: Record<string, PageCites> = {};
  const titles = new Set([...hits.keys(), ...gaps.keys()]);
  let hitCount = 0;
  let gapCount = 0;
  for (const title of titles) {
    const h = [...(hits.get(title)?.entries() ?? [])]
      .map(([phrase, cites]) => ({ phrase, cites }))
      .sort((a, b) => b.phrase.length - a.phrase.length);
    const g = [...(gaps.get(title)?.entries() ?? [])]
      .map(([phrase, cites]) => ({ phrase, cites }))
      .filter((gap) => !h.some((hit) => hit.phrase === gap.phrase))
      .sort((a, b) => b.phrase.length - a.phrase.length)
      .slice(0, 40);
    if (!h.length && !g.length) continue;
    pages[title] = { hits: h, gaps: g };
    hitCount += h.length;
    gapCount += g.length;
  }
  const pagesWithHits = Object.values(pages).filter((p) => p.hits.length > 0).length;
  const parity = { built: new Date().toISOString(), stats: { hits: hitCount, gaps: gapCount, pagesWithHits }, pages };
  return { parity, warnings: citationReport(sightings, texts, canonical) };
}

export function writeParity(built = buildParity()): { parity: Parity; warnings: string[] } {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(built.parity));
  return built;
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (!existsSync(GAME_SRC)) {
    console.warn(`wiki parity: game source not found at ${GAME_SRC}; writing a cite index with no code matches`);
  }
  const { parity, warnings } = writeParity();
  console.log(
    `wiki parity: ${parity.stats.pagesWithHits} pages, ${parity.stats.hits} phrases, ${parity.stats.gaps} not verbatim`,
  );
  for (const line of warnings) console.log(`wiki citation: ${line}`);
}

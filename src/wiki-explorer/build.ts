/**
 * Build the parity index: each wiki phrase the implementation uses, cited as `file#anchor`.
 * Run with `node scripts/wiki-parity.mjs`. The reader loads `public/wiki-reader/parity.json`.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import en from "../i18n/en.json" with { type: "json" };
import { type Cite, type Sighting, normTitle, scanSource } from "./scan.ts";
import { norm, plainText } from "./wikitext.ts";

export type PhraseCite = { phrase: string; cites: Cite[] };
export type PageCites = { hits: PhraseCite[]; gaps: PhraseCite[] };
export type Parity = {
  built: string;
  stats: { hits: number; gaps: number; pagesWithHits: number };
  pages: Record<string, PageCites>;
};

type Row = { title: string; ns?: number; text?: string; redirect?: string };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DUMP = join(ROOT, "src/game/wiki/dump/pages.jsonl");
const OUT = join(ROOT, "public/wiki-reader/parity.json");

const KIND_RANK: Record<Cite["kind"], number> = { marker: 0, copy: 1, comment: 2, test: 3 };

function loadDump(): { rows: Row[]; canonical: Map<string, string>; plain: Map<string, string> } {
  const byTitle = new Map<string, Row>();
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
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
  for (const row of articles) {
    if (!row.text) continue;
    const can = canonical(row.title);
    if (!plain.has(can)) plain.set(can, norm(plainText(row.text)));
  }
  return { rows: articles, canonical: titleByNorm, plain };
}

function walk(dir: string, out: string[]) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "wiki-explorer" || ent.name === "dump") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith(".d.ts")) out.push(p);
  }
}

function mergeCite(list: Cite[], cite: Cite) {
  const sig = `${cite.file}#${cite.anchor}#${cite.kind}#${cite.key ?? ""}`;
  if (list.some((c) => `${c.file}#${c.anchor}#${c.kind}#${c.key ?? ""}` === sig)) return;
  list.push(cite);
  list.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.file.localeCompare(b.file));
  if (list.length > 8) list.length = 8;
}

export function buildParity(): Parity {
  const { canonical, plain } = loadDump();
  const i18n = new Map<string, string>();
  for (const [key, value] of Object.entries(en)) if (typeof value === "string") i18n.set(key, value);

  const files: string[] = [];
  walk(join(ROOT, "src"), files);
  const sightings: Sighting[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
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
  return { built: new Date().toISOString(), stats: { hits: hitCount, gaps: gapCount, pagesWithHits }, pages };
}

export function writeParity(parity = buildParity()): Parity {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(parity));
  return parity;
}

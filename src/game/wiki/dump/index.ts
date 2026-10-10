/**
 * Test-only access to the FTL wiki dump (pages.jsonl): every main-namespace article from ftl.fandom.com
 * ({ title, ns, text }), every redirect title ({ title, ns, redirect }), and the Template:EventList pages and templates a
 * redirect points at (ns 10). Refresh with `node scripts/wiki-dump.mjs`.
 * Not imported by the game.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Row = { title: string; ns: number; text?: string; redirect?: string };

const SOURCE = new URL("./pages.jsonl", import.meta.url);

const rows = new Map<string, Row>();
for (const line of readFileSync(SOURCE, "utf8").split("\n")) {
  if (!line) continue;
  const row = JSON.parse(line) as Row;
  rows.set(row.title, row);
}
// A redirect title reads as its target's text, as the earlier dump did, so an event page renamed on the wiki can still
// be found under the title the code cites.
for (const row of rows.values()) {
  if (row.redirect && row.text == null) row.text = rows.get(row.redirect.split("#")[0])?.text;
}

/**
 * Path of the resolved dump (redirects carry their target's text), for tests that scan it line by line.
 * Written once per process to a temp directory.
 */
export const DUMP = join(mkdtempSync(join(tmpdir(), "ftl-wiki-")), "pages.jsonl");
writeFileSync(DUMP, [...rows.values()].map((row) => JSON.stringify(row)).join("\n") + "\n");

/** Wikitext of one article, by its wiki title (a redirect reads as its target). Throws when the dump has no such page. */
export function wikiPage(title: string): string {
  const text = rows.get(title)?.text;
  if (text == null) throw new Error(`wiki dump has no page "${title}"`);
  return text;
}

/** Every title in the dump: articles and redirects. */
export function wikiTitles(): string[] {
  return [...rows.keys()];
}

import assert from "node:assert/strict";
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { describe, it } from "node:test";
import { EXTRA_EVENTS, type CitedFx } from "./cited-events-mantis.ts";
import { DUMP } from "./dump/index.ts";

const TITLES = [
  "Boarders: Humans near sun",
  "Boarders: Mantis",
  "Empty beacon (Mantis)",
  "Escape pod",
  "Mantis fight near sun",
  "Mantis ship-collectors",
  "Store (Mantis)",
] as const;


function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function locationNames(wikitext: string): string[] {
  const match = wikitext.match(/\{\{Locations\|([^}]*)\}\}/);
  assert.ok(match, "Locations line");
  return match[1]
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="));
}

function fxNumbers(fx: CitedFx): number[] {
  if (fx.k === "res") return [fx.lo, fx.hi];
  if (fx.k === "hull" || fx.k === "fleet") return [fx.n];
  return [];
}

async function pageText(title: string): Promise<string> {
  const lines = createInterface({ input: createReadStream(DUMP), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes(`"title": ${JSON.stringify(title)}`) && !line.includes(`"title":${JSON.stringify(title)}`)) {
      continue;
    }
    const page = JSON.parse(line) as { title?: string; text?: string };
    if (page.title !== title) continue;
    lines.close();
    return page.text ?? "";
  }
  throw new Error(`missing dump page ${title}`);
}

describe("cited mantis events", () => {
  it("keeps only these titles, their Locations names, and commented numbers", async () => {
    const allowed = new Set<string>(TITLES);
    const src = readFileSync(new URL("./cited-events-mantis.ts", import.meta.url), "utf8");
    assert.ok(EXTRA_EVENTS.length >= 1);
    for (const ev of EXTRA_EVENTS) {
      assert.ok(allowed.has(ev.dest), ev.dest);
      assert.equal(ev.slug, slugOf(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      // The printed near-sun boarders opening is 250 characters.
      assert.ok(ev.body.length <= 260);
      ev.choices.forEach((choice, index) => {
        assert.equal(choice.id, `c:${ev.slug}:${index}`);
      });
      const text = await pageText(ev.dest);
      assert.deepEqual(ev.sectors, locationNames(text));
      const start = src.indexOf(`dest: "${ev.dest}"`);
      assert.ok(start >= 0);
      const next = src.indexOf("\n  {", start + 1);
      const slice = src.slice(start, next === -1 ? src.length : next);
      const comments = [...slice.matchAll(/\/\/([^\n]*)/g)].map((match) => match[1]).join("\n");
      for (const choice of ev.choices) {
        for (const fx of choice.fx) {
          for (const n of fxNumbers(fx)) {
            assert.match(comments, new RegExp(`(?<![\\d.])${n}(?!\\d)`), `${ev.dest} ${n}`);
          }
        }
      }
    }
    const dests = EXTRA_EVENTS.map((ev) => ev.dest);
    assert.deepEqual(dests, [
      "Mantis fight near sun",
      "Mantis ship-collectors",
      "Boarders: Humans near sun",
      "Boarders: Mantis",
      "Escape pod",
    ]);
  });
});

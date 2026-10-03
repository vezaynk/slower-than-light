import assert from "node:assert/strict";
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { describe, it } from "node:test";
import { EXTRA_EVENTS, type CitedFx } from "./cited-events-pirate.ts";

const TITLES = [
  "Boarders: Humans (Pirate)",
  "Destroyed cargo ship",
  "Empty beacon (Pirate)",
  "Pirate fight in nebula",
  "Refugee (Pirate)",
  "Refugee distress (Pirate)",
  "Research station with no response",
  "Store (Pirate)",
];

const DUMP = "/Users/slava/code/ftl.fandom.com-dump/pages.jsonl";

function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function numbersOf(fx: CitedFx): number[] {
  if (fx.k === "res") return [fx.lo, fx.hi];
  if (fx.k === "hull" || fx.k === "fleet") return [fx.n];
  return [];
}

function eventSlice(src: string, dest: string): string {
  const marker = `dest: "${dest}"`;
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, dest);
  const next = src.indexOf("\n  {", start + marker.length);
  return src.slice(start, next === -1 ? src.length : next);
}

function commentText(slice: string): string {
  const lines = slice
    .split("\n")
    .filter((line) => line.trimStart().startsWith("//"))
    .map((line) => line.trimStart().slice(2));
  const blocks = [...slice.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]);
  return [...lines, ...blocks].join("\n");
}

function hasNumber(comment: string, n: number): boolean {
  return new RegExp(`(?<![\\d.])${n}(?![\\d.])`).test(comment);
}

function sectorNames(text: string): string[] {
  const m = text.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(m, "Locations line");
  return m[1]
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="));
}

async function pageText(title: string): Promise<string> {
  const stream = createReadStream(DUMP, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes(title)) continue;
    const page = JSON.parse(line) as { title?: string; ns?: number; text?: string };
    if (page.ns === 0 && page.title === title) {
      rl.close();
      stream.destroy();
      return page.text ?? "";
    }
  }
  throw new Error(`missing page ${title}`);
}

describe("cited pirate events", () => {
  it("exports only these titles, with sectors and numbers cited", async () => {
    const src = readFileSync(new URL("./cited-events-pirate.ts", import.meta.url), "utf8");
    const seen = new Set<string>();
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest), ev.dest);
      assert.equal(seen.has(ev.dest), false, ev.dest);
      seen.add(ev.dest);
      assert.equal(ev.slug, slugOf(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      assert.ok(ev.choices.length >= 1);
      ev.choices.forEach((choice, n) => {
        assert.equal(choice.id, `c:${ev.slug}:${n}`);
        assert.ok(choice.fx.length >= 1);
      });

      const names = sectorNames(await pageText(ev.dest));
      assert.deepEqual(ev.sectors, names);

      const comments = commentText(eventSlice(src, ev.dest));
      for (const choice of ev.choices) {
        for (const fx of choice.fx) {
          for (const n of numbersOf(fx)) {
            assert.ok(hasNumber(comments, n), `${ev.dest} number ${n}`);
          }
          if (fx.k === "fight") assert.ok(comments.includes(fx.tier), fx.tier);
        }
      }
    }
  });
});

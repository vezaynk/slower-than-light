import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { describe, it } from "node:test";
import { EXTRA_EVENTS, type CitedFx } from "./cited-events-pirate.ts";
import { DUMP } from "@stl/wiki-dump";

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

/** A row's dest is its functional title; its slug is the wiki page title's slug. */
function titleOf(ev: { slug: string }): string {
  return (TITLES as readonly string[]).find((t) => slugOf(t) === ev.slug) ?? ev.slug;
}

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
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector, Uncharted Nebula." — [[Pirate fight in nebula]]
    // > "This random event occurs in Pirate Controlled Sector." — [[Refugee (Pirate)]]
    // > "This random event occurs in Pirate Controlled Sector." — [[Refugee distress (Pirate)]]
    // > "This random event occurs in Pirate Controlled Sector." — [[Research station with no response]]
    const seen = new Set<string>();
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(titleOf(ev)), titleOf(ev));
      assert.equal(seen.has(titleOf(ev)), false, titleOf(ev));
      seen.add(titleOf(ev));
      assert.equal(slugOf(titleOf(ev)), ev.slug);
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      assert.ok(ev.choices.length >= 1);
      ev.choices.forEach((choice, n) => {
        assert.equal(choice.id, `c:${ev.slug}:${n}`);
        assert.ok(choice.fx.length >= 1);
      });

      const page = await pageText(titleOf(ev));
      assert.deepEqual(ev.sectors, sectorNames(page));

      for (const choice of ev.choices) {
        for (const fx of choice.fx) {
          for (const n of numbersOf(fx)) {
            assert.ok(hasNumber(page, n), `${titleOf(ev)} number ${n}`);
          }
          if (fx.k === "fight") assert.ok(page.includes(fx.tier), fx.tier);
        }
      }
    }
  });
});

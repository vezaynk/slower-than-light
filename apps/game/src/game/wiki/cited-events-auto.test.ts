import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./cited-events-auto.ts";
import { DUMP } from "@stl/wiki-dump";

const CANDIDATES = [
  "Auto-ship close to star",
  "Auto-ship in nebula",
  "Auto-ship near small space-station",
  "Auto-ship near sun",
  "Automated Re-Fueling Ship",
  "No fuel: Auto-ship fight",
];

const TITLES = [
  "Auto-ship close to star",
  "Auto-ship in nebula",
  "Auto-ship near small space-station",
  "Auto-ship near sun",
  "Automated Re-Fueling Ship",
  "No fuel: Auto-ship fight",
];

const SECTORS = new Set([
  "STANDARD_SPACE",
  "CIVILIAN_SECTOR",
  "ENGI_SECTOR",
  "ENGI_HOME",
  "ZOLTAN_SECTOR",
  "ZOLTAN_HOME",
  "LANIUS_SECTOR",
  "MANTIS_SECTOR",
  "MANTIS_HOME",
  "PIRATE_SECTOR",
  "REBEL_SECTOR",
  "REBEL_SECTOR_MINIBOSS",
  "ROCK_SECTOR",
  "ROCK_HOME",
  "SLUG_SECTOR",
  "SLUG_HOME",
  "NEBULA_SECTOR",
  "CRYSTAL_HOME",
  "FINAL",
]);

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function locationNames(text: string): string[] {
  const m = text.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(m, "Locations");
  return m[1]
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="))
    .filter((part) => SECTORS.has(part));
}

function pages(titles: string[]): Map<string, string> {
  const want = new Set(titles);
  const out = new Map<string, string>();
  const raw = readFileSync(DUMP, "utf8");
  for (const line of raw.split("\n")) {
    if (!line) continue;
    let hit = false;
    for (const title of want) {
      if (line.includes(title)) {
        hit = true;
        break;
      }
    }
    if (!hit) continue;
    const row = JSON.parse(line) as { title?: string; ns?: number; text?: string };
    if (row.ns === 0 && row.title && want.has(row.title) && typeof row.text === "string") {
      out.set(row.title, row.text);
    }
  }
  return out;
}

describe("cited auto events", () => {
  const wiki = pages(TITLES);

  it("exports only candidate titles, with sectors copied from filtered Locations", () => {
    assert.equal(wiki.size, TITLES.length);
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest));
      assert.ok(CANDIDATES.includes(ev.dest));
      assert.equal(ev.slug, slug(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      assert.deepEqual(ev.aliases, [ev.dest]);
      const text = wiki.get(ev.dest);
      assert.ok(text);
      assert.deepEqual(ev.sectors, locationNames(text));
      ev.choices.forEach((choice, i) => {
        assert.equal(choice.id, `c:${ev.slug}:${i}`);
        for (const fx of choice.fx) {
          if (fx.k === "fight") assert.ok(text.includes(fx.tier));
        }
      });
    }
  });
});

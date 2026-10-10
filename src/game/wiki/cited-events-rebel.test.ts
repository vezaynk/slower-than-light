import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./cited-events-rebel.ts";
import { DUMP } from "./dump/index.ts";

const TITLES = [
  "Empty beacon (Last Stand)",
  "Empty beacon (Rebel)",
  "Fight in Last Stand",
  "Rebel defector",
  "Rebel fight among Rebel fleet",
  "Rebel fight with boarders",
  "Repair station in Last Stand",
  "Store (Rebel)",
];

const SRC = new URL("./cited-events-rebel.ts", import.meta.url);

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
    .filter((part) => part.length > 0 && !part.includes("="));
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

function eventSlice(src: string, dest: string): string {
  const at = src.indexOf(`dest: "${dest}"`);
  assert.ok(at >= 0, dest);
  const next = src.indexOf("\n  {", at + 10);
  return src.slice(at, next === -1 ? src.length : next);
}

describe("cited rebel events", () => {
  const wiki = pages(TITLES);

  it("exports only these titles, with sectors copied from Locations", () => {
    assert.equal(wiki.size, TITLES.length);
    const dests = EXTRA_EVENTS.map((ev) => ev.dest);
    assert.deepEqual(dests, ["Rebel fight among Rebel fleet", "Rebel fight with boarders"]);
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest));
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

  it("keeps each stated number in the comment above that choice", () => {
    const src = readFileSync(SRC, "utf8");
    const body = src.slice(src.indexOf("export const EXTRA_EVENTS"));
    for (const ev of EXTRA_EVENTS) {
      const slice = eventSlice(body, ev.dest);
      const comments = [...slice.matchAll(/\/\/(.*)/g)].map((m) => m[1]);
      const nums = [...slice.matchAll(/\b(?:lo|hi|n|sign):\s*(-?\d+)/g)].map((m) => m[1]);
      for (const n of nums) {
        assert.ok(
          comments.some((line) => line.includes(n)),
          `${ev.dest} ${n}`,
        );
      }
    }
    const fleet = EXTRA_EVENTS[0].choices[0];
    assert.equal(fleet.label, "Fight a Rebel ship");
    assert.deepEqual(fleet.fx, [{ k: "fight", tier: "Rebel ship" }]);
    const boarders = EXTRA_EVENTS[1].choices[0];
    assert.deepEqual(boarders.fx, [{ k: "fight", tier: "Rebel ship" }]);
  });
});

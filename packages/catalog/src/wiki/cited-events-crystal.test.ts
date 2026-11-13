import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./cited-events-crystal.ts";
import { DUMP } from "@stl/wiki-dump";

const TITLES = [
  "Boarders: Crystal",
  "Crystal chat",
  "Crystal fight",
  "Crystal fight choice",
  "Crystal scrap collector",
  "Crystalline cache",
  "Crystalline men buried",
  "Crystalline research facility",
  "Empty beacon (Crystal)",
  "Pirate ship attacking Crystal",
  "Rebel fight (Crystal)",
  "Store (Crystal)",
];

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function pages(): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
    if (!line) continue;
    const o = JSON.parse(line) as { title?: string; ns?: number; text?: string };
    if (o.ns === 0 && o.title && TITLES.includes(o.title)) out.set(o.title, o.text ?? "");
  }
  return out;
}

function locationNames(text: string): string[] {
  const line = text.split("\n").find((l) => l.startsWith("{{Locations|"));
  assert.ok(line, "missing Locations");
  return line
    .replace(/^\{\{Locations\|/, "")
    .replace(/\}\}$/, "")
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p && !p.includes("="));
}

describe("cited crystal events", () => {
  const wiki = pages();

  it("exports only these titles and every Locations name", () => {
    // Wiki citations:
    // > "This random event occurs in Hidden Crystal Worlds." — [[Crystal fight]]
    // > "This random event occurs in Hidden Crystal Worlds." — [[Crystal fight choice]]
    // > "This random event occurs in Hidden Crystal Worlds." — [[Pirate ship attacking Crystal]]
    // > "This random event occurs in Hidden Crystal Worlds." — [[Rebel fight (Crystal)]]
    // > "This random event occurs in Hidden Crystal Worlds." — [[Boarders: Crystal]]
    assert.equal(wiki.size, TITLES.length);
    const dests = EXTRA_EVENTS.map((e) => e.dest);
    assert.deepEqual(dests, [
      "Crystal fight",
      "Crystal fight choice",
      "Pirate ship attacking Crystal",
      "Rebel fight (Crystal)",
      "Boarders: Crystal",
    ]);
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest));
      assert.equal(ev.slug, slug(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      assert.deepEqual(ev.sectors, locationNames(wiki.get(ev.dest) ?? ""));
      ev.choices.forEach((c, i) => {
        assert.equal(c.id, `c:${ev.slug}:${i}`);
        assert.ok(c.fx.length > 0);
      });
      const stated = ev.choices.some((c) =>
        c.fx.some(
          (fx) =>
            fx.k === "res" ||
            fx.k === "tier" ||
            fx.k === "hull" ||
            fx.k === "fleet" ||
            fx.k === "fight",
        ),
      );
      // Boarders: Crystal states the boarder line and no resource or fight.
      assert.equal(stated || ev.dest === "Boarders: Crystal", true);
    }
  });

  it("puts each reward and hull number on that page", () => {
    for (const ev of EXTRA_EVENTS) {
      const page = wiki.get(ev.dest) ?? "";
      for (const choice of ev.choices) {
        for (const fx of choice.fx) {
          const nums =
            fx.k === "res" ? [fx.lo, fx.hi] : fx.k === "hull" || fx.k === "fleet" ? [fx.n] : [];
          for (const n of nums) {
            assert.ok(new RegExp(`(?<!\\d)${Math.abs(n)}(?!\\d)`).test(page), `${ev.dest} ${n}`);
          }
        }
      }
    }
  });
});

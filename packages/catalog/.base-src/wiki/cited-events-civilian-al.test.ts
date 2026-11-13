import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./cited-events-civilian-al.ts";
import { DUMP } from "@stl/wiki-dump";

const TITLES = [
  "Asteroid belt distress",
  "Asteroid mining colony",
  "Auto-ship fight",
  "Auto-ship fight in plasma storm",
  "Auto-ship near storage station",
  "Auto-ship warning in nebula",
  "Boarders: Humans (Abandoned)",
  "Boarders: Humans in nebula",
  "Boarders: rebels in nebula",
  "Capture the ship",
  "Crew hiring station",
  "Crushed pirate",
  "Empty beacon (Civilian)",
  "Empty beacon (Lanius)",
  "Empty nebula beacon",
  "Encrypted federation signal",
  "Escort civilians",
  "Fire on research station",
  "Free weapon",
  "Friendly ship out of fuel",
  "Giant alien spiders",
  "Improve reactor for supplies",
  "Lanius craftsmen",
  "Lanius empty distress beacon 1",
  "Lanius empty distress beacon 2",
  "Lanius fight",
  "Lanius fight distress",
  "Lanius fight in asteroid field",
  "Lanius fight near pulsar",
  "Lanius lone ship",
  "Lanius powered-down ship",
  "Lanius ship absorbing jump beacon",
  "Lanius ship absorbing rebel base",
  "Lanius ship attacking Slug",
  "Lanius with Federation science craft",
  "Large asteroid field",
  "Large trade station",
];

const SHIPS = new Set([
  "Auto-ship",
  "Pirate ship",
  "Rebel ship",
  "Rock ship",
  "Mantis ship",
  "Slug ship",
  "Zoltan ship",
  "Lanius ship",
  "Engi ship",
  "Crystal ship",
]);

function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function locationNames(page: string): string[] {
  const match = page.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(match, "page has a Locations line");
  return match[1]
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="));
}

function loadPages(titles: string[]): Map<string, string> {
  const want = new Set(titles);
  const found = new Map<string, string>();
  const dump = readFileSync(DUMP, "utf8");
  for (const line of dump.split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as { title?: string; text?: string; ns?: number };
    if (row.ns !== 0 || !row.title || !want.has(row.title)) continue;
    found.set(row.title, row.text ?? "");
    if (found.size === want.size) break;
  }
  return found;
}

function numberTokens(text: string): number[] {
  return [...text.matchAll(/(?<!\d)(\d+)(?!\d)/g)].map((match) => Number(match[1]));
}

describe("cited events civilian and abandoned", () => {
  const pages = loadPages(TITLES);

  it("keeps every dest on this title list and every sector on that page", () => {
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Auto-ship fight]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Auto-ship fight in plasma storm]]
    // > "It is unique." — [[Auto-ship fight in plasma storm]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Rebel Controlled Sector, Rebel Stronghold, Slug Controlled Nebula, Slug Home Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Auto-ship near storage station]]
    // > "It is unique." — [[Auto-ship near storage station]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Auto-ship warning in nebula]]
    // > "It is unique." — [[Auto-ship warning in nebula]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rock Controlled Sector, Rock Homeworlds." — [[Escort civilians]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Hidden Crystal Worlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula." — [[Free weapon]]
    // > "This random event occurs in Abandoned Sector." — [[Lanius fight]]
    // > "This random event occurs in Abandoned Sector." — [[Lanius fight distress]]
    // > "It is unique." — [[Lanius fight distress]]
    // > "This random event occurs in Abandoned Sector." — [[Lanius fight in asteroid field]]
    // > "It is unique." — [[Lanius fight in asteroid field]]
    // > "This random event occurs in Abandoned Sector." — [[Lanius fight near pulsar]]
    // > "It is unique." — [[Lanius fight near pulsar]]
    // > "This random event occurs in Abandoned Sector." — [[Lanius lone ship]]
    // > "It is unique." — [[Lanius lone ship]]
    // > "This random event occurs in Abandoned Sector." — [[Lanius powered-down ship]]
    // > "It is unique." — [[Lanius powered-down ship]]
    // > "This random event occurs in Abandoned Sector." — [[Lanius ship attacking Slug]]
    // > "It is unique." — [[Lanius ship attacking Slug]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Uncharted Nebula." — [[Boarders: Humans in nebula]]
    // > "It is unique." — [[Boarders: Humans in nebula]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Boarders: rebels in nebula]]
    // > "It is unique." — [[Boarders: rebels in nebula]]
    assert.equal(pages.size, TITLES.length);
    const seen = new Set<string>();
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest), ev.dest);
      assert.ok(!seen.has(ev.dest), ev.dest);
      seen.add(ev.dest);
      assert.equal(ev.slug, slugOf(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.aliases.includes(ev.dest));
      // The printed Lanius pulsar intro is 247 characters.
      assert.ok(ev.body.length <= 280);
      const names = locationNames(pages.get(ev.dest) ?? "");
      assert.deepEqual(ev.sectors, names);
      ev.choices.forEach((choice, index) => {
        assert.equal(choice.id, `c:${ev.slug}:${index}`);
        assert.ok(choice.fx.length > 0);
      });
      const stated = ev.choices.some((choice) =>
        choice.fx.some(
          (fx) =>
            fx.k === "res" ||
            fx.k === "tier" ||
            fx.k === "hull" ||
            fx.k === "fleet" ||
            fx.k === "fight",
        ),
      );
      // Nebula boarder pages state the boarder line and no resource or fight.
      const boarders =
        ev.dest === "Boarders: Humans in nebula" || ev.dest === "Boarders: rebels in nebula";
      assert.ok(stated || boarders, ev.dest);
    }
  });

  it("matches every numeric lo, hi, and n to the page", () => {
    for (const ev of EXTRA_EVENTS) {
      const page = pages.get(ev.dest) ?? "";
      const pageNumbers = new Set(numberTokens(page));
      for (const choice of ev.choices) {
        for (const fx of choice.fx) {
          const nums =
            fx.k === "res" ? [fx.lo, fx.hi] : fx.k === "hull" || fx.k === "fleet" ? [fx.n] : [];
          for (const n of nums) {
            assert.ok(pageNumbers.has(n), `${ev.dest} page missing ${n}`);
          }
          if (fx.k === "fight") assert.ok(SHIPS.has(fx.tier), fx.tier);
          if (fx.k === "tier")
            assert.ok(fx.tier === "low" || fx.tier === "medium" || fx.tier === "high");
          if (fx.k === "res") {
            assert.ok(fx.lo <= fx.hi);
            assert.ok(fx.sign === 1 || fx.sign === -1);
          }
        }
        const tier = choice.fx.find((fx) => fx.k === "tier");
        if (tier && tier.k === "tier" && tier.resources) {
          assert.equal(
            choice.fx.some(
              (fx) =>
                fx.k === "res" && (fx.id === "fuel" || fx.id === "missiles" || fx.id === "parts"),
            ),
            false,
          );
        }
      }
    }
  });
});

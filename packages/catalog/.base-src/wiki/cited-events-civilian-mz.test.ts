import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DUMP } from "@stl/wiki-dump";
import { EXTRA_EVENTS } from "./cited-events-civilian-mz.ts";

const TITLES = [
  "Malfunctioning defense system",
  "Mantis fight",
  "Mantis fight in nebula",
  "Merchant's request",
  "Nebula lost ship",
  "Pirate engine hacker",
  "Pirate fight",
  "Pirate fight (Lanius)",
  "Pirate fight in asteroid field",
  "Pirate fight near pulsar",
  "Pirate fight near sun",
  "Pirate ship attacking civilian",
  "Pirate ship distress trap",
  "Pirate smuggler",
  "Pirate toll",
  "Plasma storm incapacitated ships",
  "Rebel fight",
  "Rebel fight (Lanius)",
  "Rebel fight choice in nebula",
  "Rebel fight in nebula",
  "Rebel fight near pulsar",
  "Rebel ship warning",
  "Refueling platform garbled broadcast",
  "Refugee",
  "Refugee comms down",
  "Refugee distress",
  "Remote settlement",
  "Repair station",
  "Settlement mercenary work",
  "Single life form on moon",
  "Store",
  "Store (Lanius)",
  "Trade fuel for drone parts",
  "Trade resources",
  "Trade resources in nebula",
  "Trade scrap for upgrades",
  "Unknown disease on mining colony",
] as const;

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

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function locations(text: string): string[] {
  const m = text.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(m, "Locations line");
  return m[1]
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="));
}

function hasNumber(text: string, n: number): boolean {
  return new RegExp(`(?<!\\d)${n}(?!\\d)`).test(text);
}

function loadPages(): Map<string, string> {
  const want = new Set<string>(TITLES);
  const found = new Map<string, string>();
  const raw = readFileSync(DUMP, "utf8");
  for (const line of raw.split("\n")) {
    if (!line.includes('"ns": 0') && !line.includes('"ns":0')) continue;
    const o = JSON.parse(line) as { ns?: number; title?: string; text?: string };
    if (o.ns !== 0 || !o.title || !want.has(o.title)) continue;
    found.set(o.title, o.text ?? "");
  }
  return found;
}

describe("civilian M-Z cited events", () => {
  const pages = loadPages();

  it("exports only these titles, with sectors and numbers from the page", () => {
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Mantis Controlled Sector, Mantis Homeworlds." — [[Mantis fight]]
    // > "This random event occurs in Civilian Sector, Uncharted Nebula." — [[Mantis fight in nebula]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate engine hacker]]
    // > "It is unique." — [[Pirate engine hacker]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate fight]]
    // > "This random event occurs in Abandoned Sector." — [[Pirate fight (Lanius)]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate fight in asteroid field]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate fight near pulsar]]
    // > "It is unique." — [[Pirate fight near pulsar]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate fight near sun]]
    // > "It is unique." — [[Pirate fight near sun]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula." — [[Pirate ship attacking civilian]]
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Pirate ship distress trap]]
    // > "It is unique." — [[Pirate ship distress trap]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Uncharted Nebula." — [[Pirate smuggler]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate toll]]
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds, Rebel Controlled Sector, Rebel Stronghold, The Last Stand, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rebel fight]]
    // > "This random event occurs in Abandoned Sector." — [[Rebel fight (Lanius)]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rebel fight choice in nebula]]
    // > "It is unique." — [[Rebel fight choice in nebula]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rebel fight in nebula]]
    // > "This random event occurs in Civilian Sector, Mantis Controlled Sector, Mantis Homeworlds, Rebel Controlled Sector, Rebel Stronghold, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rebel fight near pulsar]]
    // > "It is unique." — [[Rebel fight near pulsar]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Rebel Controlled Sector, Rebel Stronghold." — [[Rebel ship warning]]
    // > "It is unique." — [[Rebel ship warning]]
    // > "This random event occurs in Abandoned Sector." — [[Refueling platform garbled broadcast]]
    // > "It is unique." — [[Refueling platform garbled broadcast]]
    // > "This random event occurs in Civilian Sector." — [[Remote settlement]]
    // > "It is unique." — [[Remote settlement]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Hidden Crystal Worlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Repair station]]
    // > "It is unique." — [[Repair station]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Trade fuel for drone parts]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Trade resources]]
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Trade resources in nebula]]
    // > "It is unique." — [[Trade resources in nebula]]
    assert.equal(pages.size, TITLES.length);
    const seen = new Set<string>();
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest as (typeof TITLES)[number]), ev.dest);
      assert.ok(!seen.has(ev.dest), ev.dest);
      seen.add(ev.dest);
      assert.equal(ev.slug, slug(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      const page = pages.get(ev.dest) ?? "";
      assert.deepEqual(ev.sectors, locations(page));
      ev.choices.forEach((choice, i) => {
        assert.equal(choice.id, `c:${ev.slug}:${i}`);
        assert.ok(choice.fx.length > 0);
        for (const fx of choice.fx) {
          const nums: number[] = [];
          if (fx.k === "res") nums.push(fx.lo, fx.hi);
          else if (fx.k === "hull" || fx.k === "fleet") nums.push(fx.n);
          else if (fx.k === "fight") assert.ok(SHIPS.has(fx.tier), fx.tier);
          for (const n of nums) {
            assert.ok(hasNumber(page, n), `${ev.dest} ${n} missing from page`);
          }
        }
      });
    }
  });
});

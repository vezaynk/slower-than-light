import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS, type CitedFx } from "./cited-events-slug.ts";
import { DUMP } from "@stl/wiki-dump";

const TITLES = [
  "Abandoned station",
  "Empty beacon (Slug)",
  "Empty nebula beacon (Slug)",
  "Intelligent ponies",
  "Mantis fight (Slug)",
  "Mantis fight choice in nebula",
  "Mantis fight in nebula (Slug)",
  "Mantis ship attacking Slug ship",
  "Nebula wreckage",
  "Pirate fight (Slug)",
  "Pirate fight choice in nebula",
  "Rebel fight (Slug)",
  "Rebel fight chance",
  "Rebel fight chance in nebula",
  "Refugee (Slug)",
  "Refugee distress (Slug)",
  "Slocknog",
  "Slug Home Nebula surrender",
  "Slug and Rock standoff in nebula",
  "Slug comm tapping",
  "Slug fight",
  "Slug fight in nebula",
  "Slug fight in plasma storm",
  "Slug moons question",
  "Slug oxygen malfunction",
  "Slug repair station",
  "Slug ship boarding Rock ship",
  "Slug store ship",
  "Store in nebula (Slug)",
  "Store in nebula (Uncharted)",
  "Terraforming scan",
  "The Black Raven",
];

/** A row's dest is its wiki page title, and its slug is that title's slug. */
function titleOf(ev: { slug: string }): string {
  return (TITLES as readonly string[]).find((t) => slugOf(t) === ev.slug) ?? ev.slug;
}

function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function pages(): Map<string, string> {
  const want = new Set(TITLES);
  const found = new Map<string, string>();
  const raw = readFileSync(DUMP, "utf8");
  for (const line of raw.split("\n")) {
    if (!line.includes('"ns": 0') && !line.includes('"ns":0')) continue;
    const row = JSON.parse(line) as { title?: string; ns?: number; text?: string };
    if (row.ns !== 0 || !row.title || !want.has(row.title)) continue;
    found.set(row.title, row.text ?? "");
    if (found.size === want.size) break;
  }
  return found;
}

function locationNames(text: string): string[] {
  const line = text.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(line, "Locations");
  return line[1]
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="));
}

function fxNumbers(fx: CitedFx[]): number[] {
  const nums: number[] = [];
  for (const step of fx) {
    if (step.k === "res") nums.push(step.lo, step.hi);
    if (step.k === "hull" || step.k === "fleet") nums.push(step.n);
  }
  return nums;
}

function wikiPlain(text: string): string {
  return text.replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, "$1").replace(/\[\[([^\]]+)\]\]/g, "$1");
}

describe("EXTRA_EVENTS slug list", () => {
  const dump = pages();

  it("exports only these titles, with the slug, flag, and choice ids", () => {
    assert.equal(new Set(EXTRA_EVENTS.map((event) => titleOf(event))).size, EXTRA_EVENTS.length);
    for (const event of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(titleOf(event)), titleOf(event));
      assert.equal(slugOf(titleOf(event)), event.slug);
      assert.equal(event.flag, `cited:${event.slug}`);
      assert.ok(event.aliases.includes(event.dest));
      assert.ok(event.body.length <= 240);
      assert.ok(event.choices.length > 0);
      event.choices.forEach((choice, index) => {
        assert.equal(choice.id, `c:${event.slug}:${index}`);
        assert.ok(choice.label.length > 0);
        assert.ok(choice.fx.length > 0);
      });
      // Refugee (Slug) keeps the fight inside the hail. The opening choices are the trade or the bait, not a fight button.
      if (
        titleOf(event) !== "Slocknog" &&
        titleOf(event) !== "Refugee (Slug)" &&
        titleOf(event) !== "Refugee distress (Slug)"
      )
        assert.ok(event.choices.some((choice) => choice.fx.some((step) => step.k === "fight")));
    }
  });

  it("uses every sector name on that page's Locations line", () => {
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Mantis fight (Slug)]]
    // > "This random event occurs in Uncharted Nebula." — [[Mantis fight choice in nebula]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Mantis fight in nebula (Slug)]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Mantis ship attacking Slug ship]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Pirate fight (Slug)]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Pirate fight choice in nebula]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Rebel fight (Slug)]]
    // > "This random event occurs in Slug Home Nebula." — [[Slug Home Nebula surrender]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug fight]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug fight in nebula]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug fight in plasma storm]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula." — [[Rebel fight chance in nebula]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slocknog]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug ship boarding Rock ship]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Refugee (Slug)]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Refugee distress (Slug)]]
    for (const event of EXTRA_EVENTS) {
      const text = dump.get(titleOf(event));
      assert.ok(text, titleOf(event));
      assert.deepEqual(event.sectors, locationNames(text));
      const plain = wikiPlain(text);
      // The stand-in's opening is functional text, never the page's sentence.
      if (event.body.length >= 40) assert.ok(!plain.includes(event.body), titleOf(event));
      for (const choice of event.choices) {
        for (const step of choice.fx) {
          if (step.k === "fight")
            assert.ok(plain.includes(step.tier), `${titleOf(event)} ${step.tier}`);
        }
      }
    }
  });

  it("puts each reward and hull number on that page", () => {
    for (const event of EXTRA_EVENTS) {
      const text = dump.get(titleOf(event)) ?? "";
      const nums = event.choices.flatMap((choice) => fxNumbers(choice.fx));
      for (const n of nums) {
        assert.ok(new RegExp(`(?<![\\d.])${n}(?!\\d)`).test(text), `${titleOf(event)} ${n}`);
      }
    }
  });
});

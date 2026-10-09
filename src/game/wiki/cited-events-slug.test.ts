import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS, type CitedFx } from "./cited-events-slug.ts";

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
  const raw = readFileSync("/Users/slava/code/ftl.fandom.com-dump/pages.jsonl", "utf8");
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
    assert.equal(new Set(EXTRA_EVENTS.map((event) => event.dest)).size, EXTRA_EVENTS.length);
    for (const event of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(event.dest), event.dest);
      assert.equal(event.slug, slugOf(event.dest));
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
      if (event.dest !== "Slocknog" && event.dest !== "Refugee (Slug)") assert.ok(event.choices.some((choice) => choice.fx.some((step) => step.k === "fight")));
    }
  });

  it("uses every sector name on that page's Locations line", () => {
    for (const event of EXTRA_EVENTS) {
      const text = dump.get(event.dest);
      assert.ok(text, event.dest);
      assert.deepEqual(event.sectors, locationNames(text));
      const plain = wikiPlain(text);
      // The nodistress sentence is on Template:Drifting Refugee Ship, not on this page.
      if (event.body && event.dest !== "Refugee (Slug)") assert.ok(plain.includes(event.body), event.dest);
      for (const choice of event.choices) {
        for (const step of choice.fx) {
          if (step.k === "fight")
            assert.ok(plain.includes(step.tier), `${event.dest} ${step.tier}`);
        }
      }
    }
  });

  it("matches every fx number to a comment on that event", () => {
    const src = readFileSync(new URL("./cited-events-slug.ts", import.meta.url), "utf8");
    for (const event of EXTRA_EVENTS) {
      const at = src.indexOf(`dest: "${event.dest}"`);
      assert.ok(at >= 0, event.dest);
      const next = src.indexOf("\n  {", at + 1);
      const block = src.slice(at, next === -1 ? src.length : next);
      const comments = [...block.matchAll(/\/\/(.*)/g)].map((match) => match[1]);
      const commentNums = comments.flatMap((comment) => comment.match(/\d+/g) ?? []).map(Number);
      const nums = event.choices.flatMap((choice) => fxNumbers(choice.fx));
      for (const n of nums) assert.ok(commentNums.includes(n), `${event.dest} ${n}`);
      for (const n of commentNums) assert.ok(nums.includes(n), `${event.dest} comment ${n}`);
    }
  });
});

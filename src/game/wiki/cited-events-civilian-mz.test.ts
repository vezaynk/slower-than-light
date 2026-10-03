import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
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

const SOURCE = readFileSync(new URL("./cited-events-civilian-mz.ts", import.meta.url), "utf8");

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

function commentFor(dest: string): string {
  const at = SOURCE.indexOf(`dest: "${dest}"`);
  assert.ok(at > 0, dest);
  const before = SOURCE.slice(0, at);
  const open = before.lastIndexOf("/**");
  const close = before.lastIndexOf("*/");
  assert.ok(open >= 0 && close > open, dest);
  return before.slice(open + 3, close);
}

function hasNumber(text: string, n: number): boolean {
  return new RegExp(`(?<!\\d)${n}(?!\\d)`).test(text);
}

function loadPages(): Map<string, string> {
  const want = new Set<string>(TITLES);
  const found = new Map<string, string>();
  const raw = readFileSync("/Users/slava/code/ftl.fandom.com-dump/pages.jsonl", "utf8");
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

  it("exports only these titles, with sectors and numbers from the page comment", () => {
    assert.equal(pages.size, TITLES.length);
    const seen = new Set<string>();
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest as (typeof TITLES)[number]), ev.dest);
      assert.ok(!seen.has(ev.dest), ev.dest);
      seen.add(ev.dest);
      assert.equal(ev.slug, slug(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      assert.deepEqual(ev.sectors, locations(pages.get(ev.dest) ?? ""));
      const comment = commentFor(ev.dest);
      const page = pages.get(ev.dest) ?? "";
      ev.choices.forEach((choice, i) => {
        assert.equal(choice.id, `c:${ev.slug}:${i}`);
        assert.ok(choice.fx.length > 0);
        for (const fx of choice.fx) {
          const nums: number[] = [];
          if (fx.k === "res") nums.push(fx.lo, fx.hi);
          else if (fx.k === "hull" || fx.k === "fleet") nums.push(fx.n);
          else if (fx.k === "fight") assert.ok(SHIPS.has(fx.tier), fx.tier);
          for (const n of nums) {
            assert.ok(hasNumber(comment, n), `${ev.dest} ${n} missing from comment`);
            assert.ok(hasNumber(page, n), `${ev.dest} ${n} missing from page`);
          }
        }
      });
    }
  });
});

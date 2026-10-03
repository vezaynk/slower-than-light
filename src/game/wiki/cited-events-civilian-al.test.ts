import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./cited-events-civilian-al.ts";

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
  const dump = readFileSync("/Users/slava/code/ftl.fandom.com-dump/pages.jsonl", "utf8");
  for (const line of dump.split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as { title?: string; text?: string; ns?: number };
    if (row.ns !== 0 || !row.title || !want.has(row.title)) continue;
    found.set(row.title, row.text ?? "");
    if (found.size === want.size) break;
  }
  return found;
}

function commentFor(src: string, dest: string): string {
  const needle = `dest: "${dest}"`;
  const at = src.indexOf(needle);
  assert.ok(at >= 0, `comment anchor for ${dest}`);
  const lines = src.slice(0, at).split("\n");
  const comments: string[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === "" || line === "{") continue;
    if (!line.startsWith("//")) break;
    comments.push(line.replace(/^\/\/\s?/, ""));
  }
  return comments.reverse().join("\n");
}

function numberTokens(text: string): number[] {
  return [...text.matchAll(/(?<!\d)(\d+)(?!\d)/g)].map((match) => Number(match[1]));
}

describe("cited events civilian and abandoned", () => {
  const src = readFileSync(new URL("./cited-events-civilian-al.ts", import.meta.url), "utf8");
  const pages = loadPages(TITLES);

  it("keeps every dest on this title list and every sector on that page", () => {
    assert.equal(pages.size, TITLES.length);
    const seen = new Set<string>();
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest), ev.dest);
      assert.ok(!seen.has(ev.dest), ev.dest);
      seen.add(ev.dest);
      assert.equal(ev.slug, slugOf(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.aliases.includes(ev.dest));
      assert.ok(ev.body.length <= 240);
      const names = locationNames(pages.get(ev.dest) ?? "");
      assert.deepEqual(ev.sectors, names);
      ev.choices.forEach((choice, index) => {
        assert.equal(choice.id, `c:${ev.slug}:${index}`);
        assert.ok(choice.fx.length > 0);
      });
      const stated = ev.choices.some((choice) =>
        choice.fx.some((fx) => fx.k === "res" || fx.k === "tier" || fx.k === "hull" || fx.k === "fleet" || fx.k === "fight"),
      );
      assert.ok(stated, ev.dest);
    }
  });

  it("matches every numeric lo, hi, and n to the event comment and the page", () => {
    for (const ev of EXTRA_EVENTS) {
      const comment = commentFor(src, ev.dest);
      const page = pages.get(ev.dest) ?? "";
      const commentNumbers = new Set(numberTokens(comment));
      const pageNumbers = new Set(numberTokens(page));
      for (const choice of ev.choices) {
        for (const fx of choice.fx) {
          const nums =
            fx.k === "res" ? [fx.lo, fx.hi] : fx.k === "hull" || fx.k === "fleet" ? [fx.n] : [];
          for (const n of nums) {
            assert.ok(commentNumbers.has(n), `${ev.dest} comment missing ${n}`);
            assert.ok(pageNumbers.has(n), `${ev.dest} page missing ${n}`);
          }
          if (fx.k === "fight") assert.ok(SHIPS.has(fx.tier), fx.tier);
          if (fx.k === "tier") assert.ok(fx.tier === "low" || fx.tier === "medium" || fx.tier === "high");
          if (fx.k === "res") {
            assert.ok(fx.lo <= fx.hi);
            assert.ok(fx.sign === 1 || fx.sign === -1);
          }
        }
        const tier = choice.fx.find((fx) => fx.k === "tier");
        if (tier && tier.k === "tier" && tier.resources) {
          assert.equal(
            choice.fx.some((fx) => fx.k === "res" && (fx.id === "fuel" || fx.id === "missiles" || fx.id === "parts")),
            false,
          );
        }
      }
    }
  });
});

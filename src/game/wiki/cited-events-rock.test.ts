import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./cited-events-rock.ts";

const TITLES = [
  "Ancient device",
  "Boarders: Rockmen near sun",
  "Disabled Rock ship",
  "Empty beacon (Rock)",
  "Mantis ship with Rock body parts",
  "Mantis ships battle for Rock freighter",
  "Rock and Slug standoff",
  "Rock bride",
  "Rock fight",
  "Rock fight in asteroid field",
  "Rock fight with boarders",
  "Rock fight with boarders in asteroid field",
  "Rock live mine",
  "Rock pirates fight",
  "Rock pirates fight in asteroid field",
  "Rock pirates fight near sun",
  "Rock war vessel encounter",
  "Store (Rock)",
];

const DUMP = "/Users/slava/code/ftl.fandom.com-dump/pages.jsonl";

function pages(): Map<string, string> {
  const want = new Set(TITLES);
  const found = new Map<string, string>();
  const text = readFileSync(DUMP, "utf8");
  for (const line of text.split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as { title?: string; text?: string; ns?: number };
    if (row.ns !== 0 || !row.title || !want.has(row.title)) continue;
    found.set(row.title, row.text ?? "");
  }
  return found;
}

function sectorNames(wikitext: string): string[] {
  const match = wikitext.match(/\{\{Locations\|[^}]+\}\}/);
  assert.ok(match, "Locations line");
  const inner = match[0].slice("{{Locations|".length, -2);
  return inner
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="));
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("cited rock events", () => {
  it("keeps only these titles and the sector names on each Locations line", () => {
    const found = pages();
    assert.equal(found.size, TITLES.length);
    const seen = new Set<string>();
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest), ev.dest);
      assert.ok(!seen.has(ev.dest), ev.dest);
      seen.add(ev.dest);
      assert.deepEqual(ev.sectors, sectorNames(found.get(ev.dest) ?? ""));
      assert.equal(ev.slug, slug(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      ev.choices.forEach((choice, index) => {
        assert.equal(choice.id, `c:${ev.slug}:${index}`);
      });
    }
  });

  it("matches every stated number and fight word to the comment above it", () => {
    const src = readFileSync(new URL("./cited-events-rock.ts", import.meta.url), "utf8");
    const body = src.slice(src.indexOf("export const EXTRA_EVENTS"));
    let comment = "";
    let fights = 0;
    let numbers = 0;
    for (const line of body.split("\n")) {
      const noted = line.match(/^\s*\/\/\s?(.*)$/);
      if (noted) {
        comment = noted[1] ?? "";
        continue;
      }
      const amount = line.match(/\b(?:lo|hi|n):\s*(-?\d+)/);
      if (amount) {
        numbers += 1;
        const token = amount[1] ?? "";
        assert.match(comment, new RegExp(`(?<![0-9])${token}(?![0-9])`), comment);
      }
      const tier = line.match(/\btier:\s*"([^"]+)"/);
      if (tier && comment.length > 0) {
        fights += 1;
        assert.ok(comment.includes(tier[1] ?? ""), `${tier[1]} not in ${comment}`);
      }
      if (/\basteroid:\s*true/.test(line)) {
        assert.ok(comment.includes("asteroidfield=true"), comment);
      }
    }
    assert.equal(fights, EXTRA_EVENTS.reduce((n, ev) => n + ev.choices.filter((c) => c.fx.some((fx) => fx.k === "fight")).length, 0));
    assert.equal(numbers, 0);
  });
});

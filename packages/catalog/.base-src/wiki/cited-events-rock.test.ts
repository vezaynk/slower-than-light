import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DUMP } from "@stl/wiki-dump";
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
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Mantis ship with Rock body parts]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight in asteroid field]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight with boarders]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight with boarders in asteroid field]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight in asteroid field]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight near sun]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Boarders: Rockmen near sun]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Disabled Rock ship]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock and Slug standoff]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Mantis ships battle for Rock freighter]]
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock live mine]]
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
      const text = found.get(ev.dest) ?? "";
      ev.choices.forEach((choice, index) => {
        assert.equal(choice.id, `c:${ev.slug}:${index}`);
        for (const fx of choice.fx) {
          assert.equal(fx.k === "res" || fx.k === "hull" || fx.k === "fleet", false, ev.dest);
          if (fx.k === "fight") {
            assert.ok(text.includes(fx.tier), `${ev.dest} ${fx.tier}`);
            if (fx.asteroid) assert.ok(text.includes("asteroidfield=true"), ev.dest);
          }
        }
      });
    }
  });
});

describe("rock fight with boarders in an asteroid field", () => {
  it("does not put a note on the opening fight", () => {
    const field = EXTRA_EVENTS.find(
      (e) => e.dest === "Rock fight with boarders in asteroid field",
    )!;
    assert.equal(
      field.choices[0].fx.some((fx) => fx.k === "note"),
      false,
    );
  });
});

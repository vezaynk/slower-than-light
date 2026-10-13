import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FACTION_PAGES } from "./enemies-factions.ts";

const TITLES = [
  "Engi Ships",
  "Zoltan Ships",
  "Mantis Ships",
  "Slug Ships",
  "Rock Ships",
  "Crystal Ships",
  "Lanius Ships",
  "Federation Ships",
  "Enemy Ships",
];

describe("faction pages", () => {
  it("has nine pages, one per title", () => {
    assert.equal(FACTION_PAGES.length, 9);
    assert.deepEqual(
      FACTION_PAGES.map((page) => page.title),
      TITLES,
    );
    const seen = new Set(FACTION_PAGES.map((page) => page.title));
    assert.equal(seen.size, 9);
  });

  it("status is fetched or blocked, and a blocked page has no ships", () => {
    for (const page of FACTION_PAGES) {
      assert.ok(page.status === "fetched" || page.status === "blocked", page.title);
      if (page.status === "blocked") assert.equal(page.ships.length, 0, page.title);
      const ids = new Set<string>();
      for (const ship of page.ships) {
        assert.equal(typeof ship.id, "string");
        assert.ok(ship.id.length > 0, page.title);
        assert.equal(ids.has(ship.id), false, ship.id);
        ids.add(ship.id);
        assert.equal(typeof ship.name, "string");
        assert.ok(ship.name.length > 0);
        assert.ok(Array.isArray(ship.notes));
        assert.ok(ship.notes.some((note) => /\d/.test(note)), ship.id);
      }
    }
  });

  it("does not invent a starting weapon loadout from a shared pool", () => {
    const engi = FACTION_PAGES.find((page) => page.title === "Engi Ships");
    assert.ok(engi);
    if (engi.status !== "fetched") return;
    const scout = engi.ships.find((ship) => ship.name === "Engi Scout");
    assert.ok(scout);
    assert.equal(
      scout.notes.some((note) => /Basic Laser|Burst Laser|Ion Blast/.test(note)),
      false,
    );
    assert.ok(scout.notes.some((note) => note.includes("Hull 8-13") && note.includes("7-12")));
    assert.ok(scout.notes.some((note) => note.startsWith("Shields 2-8")));
    assert.ok(scout.notes.some((note) => note.includes("Engi")));
  });
});

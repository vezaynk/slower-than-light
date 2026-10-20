import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACHIEVEMENTS } from "@stl/catalog/src/wiki/achievements.ts";
import { onPackWarning } from "@stl/pack";
import { createGame } from "../sim.ts";
import { conditionMet } from "./achievement-track.ts";

const SOURCES = new Set(["Achievements", "Ship Achievements"]);

function kebab(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("'", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

describe("achievements", () => {
  it("lists every named achievement once", () => {
    assert.ok(ACHIEVEMENTS.length > 20);
    const ids = ACHIEVEMENTS.map((row) => row.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const row of ACHIEVEMENTS) {
      assert.ok(row.desc.trim().length > 0, row.id);
      assert.ok(SOURCES.has(row.source), row.id);
      // ftl.dat's ids; the slug is what earned achievements were saved under before.
      assert.match(row.id, /^ACH_[A-Z0-9_]+$/, row.id);
      assert.equal(row.slug, kebab(row.name), row.name);
      if (row.source === "Achievements") assert.equal(row.ship, undefined, row.id);
      else assert.match(row.ship ?? "", /^PLAYER_SHIP_[A-Z]+$/, row.id);
    }
    const slugs = ACHIEVEMENTS.map((row) => row.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });
});

describe("achievement conditions", () => {
  it("leave only the two lines the game cannot see untracked, and read only known values", () => {
    assert.deepEqual(
      ACHIEVEMENTS.filter((row) => !row.condition).map((row) => row.id),
      ["ACH_FED_DIPLOMACY", "ACH_SLUG_VISION"],
    );
    const g = createGame(1);
    const warnings: string[] = [];
    const restore = onPackWarning((line) => warnings.push(line));
    try {
      for (const row of ACHIEVEMENTS) if (row.condition) conditionMet(g, row.condition);
    } finally {
      restore();
    }
    assert.deepEqual(warnings, []);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACHIEVEMENTS } from "./achievements.ts";

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
      assert.ok(row.requirement.trim().length > 0, row.id);
      assert.ok(SOURCES.has(row.source), row.id);
      assert.equal(row.id, kebab(row.name), row.name);
      assert.equal(row.id.includes("'"), false, row.id);
      if (row.source === "Achievements") assert.equal(row.ship, null, row.id);
      else assert.equal(typeof row.ship, "string", row.id);
    }
  });
});

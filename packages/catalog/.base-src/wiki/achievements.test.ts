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

  it("keeps the old wiki slugs on the archive ids", () => {
    const idOf = (slug: string) => ACHIEVEMENTS.find((row) => row.slug === slug)?.id;
    assert.equal(idOf("just-getting-started"), "ACH_SECTOR_5");
    assert.equal(idOf("scrap-hoarder"), "ACH_LANIUS_SCRAP");
    assert.equal(idOf("were-in-position"), "ACH_SLUG_VISION");
    assert.equal(ACHIEVEMENTS.find((row) => row.id === "ACH_SECTOR_8")?.id, "ACH_SECTOR_8");
  });
});

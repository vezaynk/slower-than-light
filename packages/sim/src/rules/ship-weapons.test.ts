import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import { createGame, startCombat } from "../sim.ts";

describe("fire weapons from the gap", () => {
  it("follows a gap file that names a different gun", () => {
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><shipWeapons ship="JELLY_STATUS_OXYGEN_FIRE"><anyOf>LASER_BURST_1</anyOf></shipWeapons></FTL>`,
        },
      ]),
      "append",
    );
    try {
      const g = createGame(1);
      startCombat(g, "Slug ship", false, "slug-hacker-oxygen");
      assert.equal(g.fightShip, "JELLY_STATUS_OXYGEN_FIRE");
      assert.ok(g.enemy?.weapons.some((w) => w.defId === "LASER_BURST_1"));
    } finally {
      resetPackForTests();
    }
  });
});

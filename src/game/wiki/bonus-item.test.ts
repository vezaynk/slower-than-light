import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { grantBonusAugment, rollBonusItem } from "./bonus-item.ts";

describe("bonus item (Rewards: weapon, augmentation, or drone schematic)", () => {
  it("draws all three kinds when Drone Control has room, and no drone without it", () => {
    const g = createGame(1);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(rollBonusItem(g)?.kind ?? "none");
    assert.ok(seen.has("weapon") && seen.has("augment"));
    assert.equal(seen.has("drone"), !!g.player.kits.swarm);
  });

  it("pays 25 scrap for a non-stacking duplicate, fits a stacking one, and leaves one behind on a full rack", () => {
    const g = createGame(1);
    g.augments = ["echo"];
    const scrap = g.scrap;
    assert.match(grantBonusAugment(g, "echo"), /25 scrap/);
    assert.equal(g.scrap, scrap + 25);
    assert.deepEqual(g.augments, ["echo"]);
    grantBonusAugment(g, "feed");
    grantBonusAugment(g, "feed");
    assert.deepEqual(g.augments, ["echo", "feed", "feed"]);
    assert.match(grantBonusAugment(g, "hot"), /left behind/);
    assert.equal(g.augments.length, 3);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { grantBonusAugment, rollBonusItem } from "./bonus-item.ts";

describe("bonus item (Rewards: weapon, augmentation, or drone schematic)", () => {
  it("draws all three kinds, a drone schematic even without Drone Control (it goes to cargo)", () => {
    const g = createGame(1);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(rollBonusItem(g)?.kind ?? "none");
    assert.ok(seen.has("weapon") && seen.has("augment"));
    assert.equal(seen.has("drone"), true);
  });

  it("pays 25 scrap for a non-stacking duplicate, fits a stacking one, and asks what to leave behind on a full rack", () => {
    const g = createGame(1);
    g.augments = ["echo"];
    const scrap = g.scrap;
    assert.match(grantBonusAugment(g, "echo"), /25 scrap/);
    assert.equal(g.scrap, scrap + 25);
    assert.deepEqual(g.augments, ["echo"]);
    grantBonusAugment(g, "feed");
    grantBonusAugment(g, "feed");
    assert.deepEqual(g.augments, ["echo", "feed", "feed"]);
    assert.match(grantBonusAugment(g, "hot"), /choose what to leave behind/);
    assert.equal(g.augments.length, 3);
    assert.deepEqual(g.overflow, [{ kind: "augment", id: "hot" }]);
  });
});

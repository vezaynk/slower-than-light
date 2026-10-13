import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { surrenderPlan } from "./surrender.ts";

describe("Crystal fight choice surrender", () => {
  it("never surrenders; a Crystal ship with no event still can", () => {
    // Crystal fight choice: {{SurrenderEscape(alt)|no|CRYSTAL_SHIP_NO_SURRENDER}}. The page prints no percent.
    assert.equal(
      surrenderPlan({ tier: "pool", faction: "crystal", event: "crystal-fight-choice" }, () => 0.5).chance,
      0,
    );
    assert.ok(surrenderPlan({ tier: "pool", faction: "crystal" }, () => 0.5).chance > 0);

    const g = createGame(1);
    startCombat(g, "Crystal ship", false, "crystal-fight-choice");
    assert.equal(g.fightEvent, "crystal-fight-choice");
    assert.equal(g.enemy?.faction, "crystal");
    assert.equal(g.enemySurrender?.chance, 0);
    assert.equal(g.enemyEscape?.mode, "never");

    const plain = createGame(2);
    startCombat(plain, "Crystal ship");
    assert.equal(plain.fightEvent, null);
    assert.equal(plain.enemy?.faction, "crystal");
    assert.ok((plain.enemySurrender?.chance ?? 0) > 0);
    assert.equal(plain.enemyEscape?.mode, "never");
  });
});

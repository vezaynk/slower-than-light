import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { surrenderPlan } from "./surrender.ts";

describe("Lanius ship attacking Rock surrender", () => {
  it("never surrenders; a Lanius ship with no event still can", () => {
    // Lanius ship attacking Rock: {{SurrenderEscape(alt)|no|LANIUS_ROCK_DISTRESS_SHIP}}. The page prints no percent.
    assert.equal(
      surrenderPlan({ tier: "pool", faction: "lanius", event: "lanius-ship-attacking-rock" }, () => 0.5).chance,
      0,
    );
    assert.equal(surrenderPlan({ tier: "pool", faction: "lanius" }, () => 0.5).chance, 80);

    const g = createGame(1);
    startCombat(g, "Lanius ship", false, "lanius-ship-attacking-rock");
    assert.equal(g.fightEvent, "lanius-ship-attacking-rock");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemySurrender?.chance, 0);
  });
});

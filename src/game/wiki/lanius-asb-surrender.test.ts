import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { surrenderPlan } from "./surrender.ts";

describe("Lanius fight with friendly ASB support surrender", () => {
  it("never surrenders; a Lanius ship with no event still can", () => {
    // Lanius fight with friendly ASB support: {{SurrenderEscape(alt)|no|LANIUS_BOARDERS_PDS}}. The page prints no percent.
    assert.equal(
      surrenderPlan({ tier: "pool", faction: "lanius", event: "lanius-fight-with-friendly-asb-support" }, () => 0.5).chance,
      0,
    );
    assert.equal(surrenderPlan({ tier: "pool", faction: "lanius" }, () => 0.5).chance, 80);

    const g = createGame(1);
    startCombat(g, "Lanius ship", false, "lanius-fight-with-friendly-asb-support");
    assert.equal(g.fightEvent, "lanius-fight-with-friendly-asb-support");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemySurrender?.chance, 0);
  });
});

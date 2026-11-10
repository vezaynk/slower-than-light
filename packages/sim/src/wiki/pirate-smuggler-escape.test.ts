import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";

describe("Pirate smuggler escape", () => {
  // PIRATE_SMUGGLE: `<escape min="3" max="4" timer="35">`. Omitted chance is certain. Hull points, not 30–40%.
  it("starts from the smuggler ship's 3–4 hull and 35 second timer", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      startCombat(g, "Pirate ship", false, "pirate-smuggler");
      const e = g.enemyEscape;
      assert.ok(e);
      assert.equal(e.chance, 1);
      assert.equal(e.hullPoints, true);
      assert.equal(e.seconds, 35);
      assert.ok(e.threshold >= 3 && e.threshold <= 4, `seed ${seed}: ${e.threshold}`);
      const under = g.enemy!.hull > 0 && g.enemy!.hull <= e.threshold;
      assert.equal(e.running, under);
      assert.equal(e.mode, under ? "start" : "hull");
    }
  });

  it("a plain Pirate ship stays on the Pirate row: 50% and 15 seconds", () => {
    const g = createGame(1);
    startCombat(g, "Pirate ship");
    const e = g.enemyEscape;
    assert.ok(e);
    assert.equal(e.chance, 50);
    assert.equal(e.seconds, 15);
  });

  it("keeps Pirate briber on the ship's 0.4 chance at 3–4 hull", () => {
    const g = createGame(1);
    startCombat(g, "Pirate ship", false, "pirate-briber");
    const e = g.enemyEscape;
    assert.ok(e);
    assert.equal(e.hullPoints, true);
    assert.equal(e.chance, 0.4);
    assert.equal(e.seconds, 15);
    assert.ok(e.threshold >= 3 && e.threshold <= 4);
    assert.ok(g.enemy!.hull > e.threshold);
    assert.equal(e.mode, "hull");
    assert.equal(e.running, false);
  });
});

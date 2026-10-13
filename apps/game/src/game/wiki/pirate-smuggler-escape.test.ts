import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";

describe("Pirate smuggler escape", () => {
  // "Pirate smuggler", Fight the Pirate ship: "(enemy ship starts to escape at 30-40% hull with 35 seconds countdown timer)".
  it("starts a hull run at 30-40% with a 35 second timer", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      startCombat(g, "Pirate ship", false, "pirate-smuggler");
      const e = g.enemyEscape;
      assert.ok(e);
      assert.equal(e.mode, "hull");
      assert.equal(e.chance, 100);
      assert.equal(e.seconds, 35);
      // rand() is [0, 1), so the rolled threshold stays below the printed high end.
      assert.ok(e.threshold >= 30 && e.threshold < 40, `seed ${seed}: ${e.threshold}`);
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

  it("keeps Pirate briber on the typical 15 second timer", () => {
    const g = createGame(1);
    startCombat(g, "Pirate ship", false, "pirate-briber");
    const e = g.enemyEscape;
    assert.ok(e);
    assert.equal(e.mode, "hull");
    assert.equal(e.chance, 60);
    assert.equal(e.seconds, 15);
    assert.ok(e.threshold >= 30 && e.threshold < 40);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import { startVeil } from "./veil.ts";

describe("Per the user (bug): a powered starting cloak is ready, not cooling", () => {
  it("Stealth A can cloak at the start of its first fight", () => {
    const g = createGame(1, "stealth-a");
    const veil = g.player.kits.veil!;
    assert.equal(veil.on, false);
    startCombat(g, "scout");
    g.paused = false;
    step(g, 0.05);
    assert.equal(veil.cool, 0);
    startVeil(g);
    assert.equal(veil.on, true);
    assert.ok(veil.left > 0);
  });

  it("starts every activated system idle", () => {
    for (const hull of ["mantis-a", "slug-a", "lanius-b", "crystal-a"]) {
      const g = createGame(1, hull);
      for (const id of ["veil", "sling", "leash", "spike", "cell"] as const) {
        const kit = g.player.kits[id];
        if (kit) assert.equal(kit.on, false, `${hull} ${id}`);
      }
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armWeapon, createGame, depowerWeapon, startCombat, step } from "./sim.ts";
import type { Game } from "./types.ts";

function fight(): Game {
  const g = createGame(3);
  startCombat(g, "scout");
  g.paused = false;
  return g;
}

describe("Per the user: tapping a weapon", () => {
  it("powers an unpowered weapon and starts aiming in a fight", () => {
    const g = fight();
    const w = g.player.weapons[0];
    depowerWeapon(g, w.uid);
    assert.equal(w.enabled, false);
    armWeapon(g, w.uid);
    assert.equal(w.enabled, true);
    assert.equal(g.targeting, true);
  });

  it("cannot aim without power", () => {
    const g = fight();
    const w = g.player.weapons[0];
    depowerWeapon(g, w.uid);
    g.player.reactor = 0;
    armWeapon(g, w.uid);
    assert.equal(w.enabled, false);
    assert.equal(g.targeting, false);
  });

  it("only toggles power outside a fight and drops leftover aim", () => {
    const g = fight();
    const w = g.player.weapons[0];
    w.target = g.enemy!.rooms[0].id;
    g.enemy = null;
    g.phase = "map";
    step(g, 0.05);
    assert.equal(w.target, null);
    const on = w.enabled;
    armWeapon(g, w.uid);
    assert.equal(w.enabled, !on);
    assert.equal(g.targeting, false);
    armWeapon(g, w.uid);
    assert.equal(w.enabled, on);
  });
});

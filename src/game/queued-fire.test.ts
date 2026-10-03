import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aim, armWeapon, cancelTargeting, createGame, startCombat, step, toggleAutoAll } from "./sim.ts";
import type { Game } from "./types.ts";

function fight(): Game {
  const g = createGame(3);
  startCombat(g, "scout");
  g.paused = false;
  return g;
}

function chargeUp(g: Game, uid: string) {
  const w = g.player.weapons.find((x) => x.uid === uid)!;
  w.charge = 0.999;
  for (let i = 0; i < 10 && w.charge !== 0; i++) step(g, 1 / 30);
}

describe("queued fire", () => {
  it("lets a charging gun take a target without firing", () => {
    const g = fight();
    const w = g.player.weapons[0];
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    assert.equal(w.target, g.enemy!.rooms[0].id);
    assert.equal(g.shots.filter((s) => s.from === "player").length, 0);
  });

  it("fires once when ready, then clears the target", () => {
    const g = fight();
    const w = g.player.weapons[0];
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    chargeUp(g, w.uid);
    assert.ok(g.shots.some((s) => s.from === "player" && s.defId === w.defId));
    assert.equal(w.target, null);
  });

  it("keeps the target on autofire", () => {
    const g = fight();
    toggleAutoAll(g);
    const w = g.player.weapons[0];
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    chargeUp(g, w.uid);
    assert.ok(g.shots.some((s) => s.from === "player"));
    assert.equal(w.target, g.enemy!.rooms[0].id);
  });

  it("drops a queued room when targeting is cancelled", () => {
    const g = fight();
    const w = g.player.weapons[0];
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    armWeapon(g, w.uid);
    cancelTargeting(g);
    assert.equal(w.target, null);
  });
});

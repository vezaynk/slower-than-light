import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import { BEAM1_SPEED, DRONE_LABEL } from "../extras/swarm.ts";
import { COMBAT1_SPEED, orbitLegSeconds } from "./cited-combat2.ts";
import type { Game } from "../types.ts";

function bossFight(seed: number): Game {
  const g = createGame(seed);
  const boss = g.beacons.find((b) => b.kind === "exit");
  assert.ok(boss);
  boss.kind = "boss";
  g.here = boss.id;
  startCombat(g, "boss");
  return g;
}

function stage2Surge(seed: number) {
  const g = bossFight(seed);
  g.enemy!.hull = 0;
  step(g, 0.01);
  g.bossSurge = 0.01;
  step(g, 0.02);
  const surge = g.enemy!.flagship!.surge;
  assert.ok(surge.length > 0);
  for (const d of surge) {
    d.heading = 0;
    d.bearing = 90;
    d.left = orbitLegSeconds(0, 90, d.kind === "beam" ? BEAM1_SPEED : COMBAT1_SPEED);
    d.aux = 0;
    d.shots = 0;
  }
  // Only the surge drones are under test: the stage 2 Drone Control drones fly their own random legs.
  const swarm = g.enemy!.kits.swarm;
  if (swarm) {
    swarm.loadout = [];
    swarm.drones = [];
  }
  g.shots = [];
  return g;
}

describe("stage 2 power surge drones", () => {
  it("attacks when a Speed 15 orbit leg finishes", () => {
    // Drone Control: Combat Drone Mark I and Anti-Ship Beam Drone I both print Speed 15.
    // A 90 degree leg at that speed is the 2 second shield restore.
    assert.equal(BEAM1_SPEED, 15);
    assert.equal(COMBAT1_SPEED, 15);
    const g = stage2Surge(71);
    const surge = g.enemy!.flagship!.surge;
    assert.equal(surge[0].left, 2);
    // A combat step advances at most 0.05s, so 39 steps is 1.95s of the 2s leg.
    for (let i = 0; i < 39; i++) step(g, 0.05);
    assert.equal(surge.every((d) => d.shots === 0), true);
    assert.equal(g.shots.filter((s) => s.label?.startsWith(DRONE_LABEL)).length, 0);
    step(g, 0.05);
    assert.equal(surge.every((d) => d.shots === 1), true);
    assert.ok(g.shots.some((s) => (s.label ?? "").startsWith(DRONE_LABEL)));
  });

  it("counts the shot while the player is cloaked and does not fire it", () => {
    // The Rebel Flagship, Power Surge: cloaked, they position for a shot, and that counts as one of the two.
    const g = stage2Surge(72);
    g.player.kits.veil = {
      id: "veil",
      level: 1,
      power: 1,
      left: 15,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
      damage: 0,
      fix: 0,
    };
    const surge = g.enemy!.flagship!.surge;
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.equal(surge.every((d) => d.shots === 1), true);
    assert.equal(g.shots.filter((s) => (s.label ?? "").startsWith(DRONE_LABEL)).length, 0);
  });
});

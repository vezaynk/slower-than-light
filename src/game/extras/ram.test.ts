import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PHASE_BANDS, phaseOf, rollSurge, stageHull, surgeSeconds } from "./ram.ts";
import { createGame, startCombat, step } from "../sim.ts";

describe("ram", () => {
  it("does not invent hull bands from the per-stage hull pools", () => {
    assert.equal(PHASE_BANDS, null);
  });

  it("phaseOf stays on 1 for every hull reading", () => {
    const samples: Array<[number, number]> = [
      [20, 20],
      [22, 22],
      [0, 20],
      [1, 22],
      [16, 16],
      [10, 20],
      [19, 20],
      [21, 22],
      [12, 20],
      [100, 100],
      [0, 0],
      [-1, 20],
      [20, 0],
    ];
    for (const [hull, hullMax] of samples) {
      assert.equal(phaseOf(hull, hullMax), 1);
    }
  });

  it("does not turn the random 20–30s cooldown, or bossThink's 16s, into an interval", () => {
    assert.equal(surgeSeconds(1), null);
    assert.equal(surgeSeconds(2), null);
    assert.equal(surgeSeconds(3), null);
  });

  it("uses each stage's own hull, and only rolls a surge after the first", () => {
    assert.equal(stageHull(1), 20);
    assert.equal(stageHull(2), 22);
    assert.equal(stageHull(3), 20);
    assert.equal(rollSurge(1, 0.5), null);
    assert.equal(rollSurge(2, 0), 20);
    assert.equal(rollSurge(3, 1), 30);
  });

  it("repairs the Ram onto the next hull instead of ending the fight", () => {
    const g = createGame(3);
    const boss = g.beacons.find((b) => b.kind === "exit");
    assert.ok(boss);
    boss.kind = "boss";
    g.here = boss.id;
    startCombat(g, "boss");
    assert.equal(g.ramStage, 1);
    assert.equal(g.enemy?.hull, 20);
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    g.enemy.systems.shields.damage = 1;
    step(g, 0.01);
    assert.equal(g.phase, "combat");
    assert.equal(g.ramStage, 2);
    assert.equal(g.enemy?.hull, 22);
    assert.equal(g.enemy?.systems.shields.damage, 0);
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.01);
    assert.equal(g.ramStage, 3);
    assert.equal(g.enemy?.hull, 20);
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.01);
    assert.equal(g.phase, "victory");
  });
});

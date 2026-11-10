import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { deploy, pickOrbitBearing, tickSwarm } from "../extras/swarm.ts";
import { loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import {
  COMBAT1_SPEED,
  COMBAT2,
  bearingAccepted,
  orbitChordPose,
  orbitGap,
  orbitLegSeconds,
} from "./combat2.ts";

describe("Combat Drone Mark II shot", () => {
  it("keeps power 4, damage 1, speed 28, and no printed cooldown", () => {
    assert.equal(COMBAT2.power, 4);
    assert.equal(COMBAT2.damage, 1);
    assert.equal(COMBAT2.fireChance, 0.1);
    assert.equal(COMBAT2.speed, 28);
    assert.equal(COMBAT2.cooldown, null);
  });

  it("treats 5 degrees and 355 degrees as a short flight the aim check still allows", () => {
    assert.equal(orbitGap(5, 355), 10);
    assert.equal(bearingAccepted(5, 355), true);
    assert.equal(bearingAccepted(0, 45), false);
    // xftl doc/combat-drone: stops at 1.15x the shield, Speed/21.875 semi-major units a second, 0.5 s pause.
    const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
    close(orbitLegSeconds(0, 180, COMBAT1_SPEED), (2.3 * 21.875) / 15 + 0.5);
    close(orbitLegSeconds(0, 90, COMBAT1_SPEED), (2.3 * Math.SQRT1_2 * 21.875) / 15 + 0.5);
    close(orbitLegSeconds(0, 180, COMBAT2.speed), (2.3 * 21.875) / 28 + 0.5);
    close(
      orbitLegSeconds(0, 180, COMBAT1_SPEED, 0.5),
      orbitLegSeconds(0, 180, COMBAT1_SPEED) + 0.5,
    );
    assert.ok(orbitLegSeconds(5, 355, COMBAT2.speed) < orbitLegSeconds(0, 180, COMBAT2.speed));
  });

  it("flies the straight chord and faces that chord", () => {
    const start = orbitChordPose(0, 90, 0, 4, 90, 30, 0.5);
    assert.equal(start.x, 90);
    assert.equal(start.y, 0);
    const mid = orbitChordPose(0, 90, 1, 4, 90, 30, 0.5);
    assert.ok(Math.abs(mid.x - 60) < 1e-9, `${mid.x}`);
    assert.ok(Math.abs(mid.y - 10) < 1e-9, `${mid.y}`);
    assert.ok(Math.abs(mid.angle - Math.atan2(30, -90)) < 1e-9);
    const arc = { x: Math.cos(Math.PI / 4) * 90, y: Math.sin(Math.PI / 4) * 30 };
    assert.ok(Math.hypot(mid.x - arc.x, mid.y - arc.y) > 1);
    const sat = orbitChordPose(0, 90, 4, 4, 90, 30, 0.5);
    assert.ok(Math.abs(sat.x) < 1e-9, `${sat.x}`);
    assert.ok(Math.abs(sat.y - 30) < 1e-9, `${sat.y}`);
    assert.ok(Math.abs(sat.angle - mid.angle) < 1e-9);
  });

  it("only picks an angle the non-wrapping check accepts", () => {
    const g = createGame(4);
    for (let i = 0; i < 40; i++) {
      const next = pickOrbitBearing(g, 0);
      assert.equal(bearingAccepted(0, next), true);
    }
  });

  it("follows a gap file that lengthens the pause before the shot", () => {
    const oldLeg = (2.3 * 21.875) / COMBAT1_SPEED + 0.5;
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><droneOrbit firePause="2"/></FTL>` }]),
      "append",
    );
    try {
      const leg = orbitLegSeconds(0, 180, COMBAT1_SPEED);
      assert.ok(Math.abs(leg - ((2.3 * 21.875) / COMBAT1_SPEED + 2)) < 1e-9);
      const g = createGame(6);
      g.player.kits.drones = {
        id: "drones",
        level: 3,
        power: 3,
        left: 0,
        cool: 0,
        target: null,
        on: false,
        aux: 0,
      };
      g.player.parts = 2;
      startCombat(g, "Rebel ship");
      assert.ok(g.enemy);
      delete g.enemy.kits.drones;
      for (const w of g.player.weapons) w.enabled = false;
      for (const w of g.enemy.weapons) w.enabled = false;
      assert.equal(deploy(g, "COMBAT_1"), true);
      const kit = g.player.kits.drones;
      assert.ok(kit);
      kit.heading = 0;
      kit.bearing = 180;
      kit.left = leg;
      kit.aux = 0;
      g.shots = [];
      // The old 0.5 s pause would have fired by now. The gap's 2 s pause has not.
      tickSwarm(g, oldLeg);
      assert.equal(g.shots.length, 0);
      tickSwarm(g, leg - oldLeg);
      assert.equal(g.shots.length, 1);
    } finally {
      resetPackForTests();
    }
    assert.ok(Math.abs(orbitLegSeconds(0, 180, COMBAT1_SPEED) - oldLeg) < 1e-9);
  });
});

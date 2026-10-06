import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { pickOrbitBearing } from "../extras/swarm.ts";
import {
  COMBAT1_SPEED,
  COMBAT2,
  ORBIT_DEG_PER_SPEED,
  bearingAccepted,
  orbitGap,
  orbitLegSeconds,
} from "./cited-combat2.ts";

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
    // Shields, Overview: layers 1–2 restore in 2s. A 90 degree leg at Speed 15 takes that long.
    assert.equal(ORBIT_DEG_PER_SPEED, 3);
    assert.equal(orbitLegSeconds(0, 90, COMBAT1_SPEED), 2);
    assert.equal(orbitLegSeconds(0, 180, COMBAT1_SPEED), 4);
    assert.equal(orbitLegSeconds(0, 180, COMBAT2.speed), 180 / (28 * 3));
    assert.ok(orbitLegSeconds(5, 355, COMBAT2.speed) < orbitLegSeconds(0, 180, COMBAT2.speed));
  });

  it("only picks an angle the non-wrapping check accepts", () => {
    const g = createGame(4);
    for (let i = 0; i < 40; i++) {
      const next = pickOrbitBearing(g, 0);
      assert.equal(bearingAccepted(0, next), true);
    }
  });
});

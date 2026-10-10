import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { pickOrbitBearing } from "../extras/swarm.ts";
import {
  COMBAT1_SPEED,
  COMBAT2,
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
    // xftl doc/combat-drone: stops at 1.15x the shield, Speed/21.875 semi-major units a second, 0.5 s pause.
    const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
    close(orbitLegSeconds(0, 180, COMBAT1_SPEED), (2.3 * 21.875) / 15 + 0.5);
    close(orbitLegSeconds(0, 90, COMBAT1_SPEED), (2.3 * Math.SQRT1_2 * 21.875) / 15 + 0.5);
    close(orbitLegSeconds(0, 180, COMBAT2.speed), (2.3 * 21.875) / 28 + 0.5);
    close(orbitLegSeconds(0, 180, COMBAT1_SPEED, 0.5), orbitLegSeconds(0, 180, COMBAT1_SPEED) + 0.5);
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Kit } from "./types.ts";
import { playerDroneCruising } from "./extras/swarm.ts";
import { DRIFT_TAU, stepDrift, type DroneDrift } from "./drone-drift.ts";

function kit(partial: Partial<Kit> = {}): Kit {
  return {
    id: "swarm",
    level: 2,
    power: 2,
    left: 0,
    cool: 0,
    target: "striker",
    on: true,
    aux: 0,
    ...partial,
  };
}

function coast(drift: DroneDrift, seconds: number, cruising: boolean, omega = 1) {
  const steps = Math.round(seconds / 0.05);
  for (let i = 0; i < steps; i++) stepDrift(drift, 0.05, cruising, omega, false);
}

describe("drone drift", () => {
  it("holds the angle and the speed while the clock is halted", () => {
    const drift: DroneDrift = { angle: 1.25, rate: 0.4 };
    stepDrift(drift, 5, false, 0.9, true);
    assert.equal(drift.angle, 1.25);
    assert.equal(drift.rate, 0.4);
  });

  it("keeps moving on the first unpowered frame, then eases to a stop", () => {
    const drift: DroneDrift = { angle: 0, rate: 1 };
    stepDrift(drift, 1 / 60, false, 0.9, false);
    assert.ok(drift.rate > 0.9);
    assert.ok(drift.angle > 0);

    coast(drift, 2, false);
    assert.equal(drift.rate, 0);
    const parked = drift.angle;
    assert.ok(parked > DRIFT_TAU * 0.4, `coasted ${parked}`);
    assert.ok(parked < DRIFT_TAU + 0.05, `coasted ${parked}`);
    stepDrift(drift, 0.05, false, 1, false);
    assert.equal(drift.angle, parked);
  });

  it("eases back up to cruise instead of snapping to full speed", () => {
    const drift: DroneDrift = { angle: 0, rate: 0 };
    const windows: number[] = [];
    for (let i = 0; i < 4; i++) {
      const before = drift.angle;
      stepDrift(drift, 0.2, true, 1, false);
      windows.push(drift.angle - before);
    }
    assert.ok(windows[1]! > windows[0]!);
    assert.ok(windows[2]! > windows[1]!);

    coast(drift, 2, true);
    assert.equal(drift.rate, 1);
    const at = drift.angle;
    stepDrift(drift, 0.2, true, 1, false);
    assert.ok(Math.abs(drift.angle - at - 0.2) < 1e-9);
  });

  it("coasts in the drone's own spin direction", () => {
    const drift: DroneDrift = { angle: 0, rate: 1 };
    coast(drift, 2, false, -0.8);
    assert.equal(drift.rate, 0);
    assert.ok(drift.angle < 0);
  });

  it("continues a coast that was frozen by a pause", () => {
    const drift: DroneDrift = { angle: 2, rate: 0.4 };
    stepDrift(drift, 5, false, 1, true);
    stepDrift(drift, 0.05, false, 1, false);
    assert.ok(drift.rate < 0.4);
    assert.ok(drift.angle > 2);
  });
});

describe("player drone power", () => {
  it("flies only while the deployed drone is fed its full cost", () => {
    assert.equal(playerDroneCruising(kit()), true);
    assert.equal(playerDroneCruising(kit({ power: 1 })), false);
    assert.equal(playerDroneCruising(kit({ idle: true })), false);
    assert.equal(playerDroneCruising(kit({ on: false })), false);
    assert.equal(playerDroneCruising(kit({ power: 0, zoltan: 2 })), true);
    assert.equal(playerDroneCruising(kit({ power: 0, zoltan: 1 })), false);
    assert.equal(playerDroneCruising(kit({ level: 2, damage: 1, power: 2 })), false);
  });

  it("uses the cited cost for schematics outside the original eight", () => {
    assert.equal(playerDroneCruising(kit({ level: 4, power: 4, target: "combat2" })), true);
    assert.equal(playerDroneCruising(kit({ level: 4, power: 3, target: "combat2" })), false);
    assert.equal(playerDroneCruising(kit({ power: 2, target: "overchargerplus" })), true);
    assert.equal(playerDroneCruising(kit({ power: 1, target: "overchargerplus" })), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { skyScene, type SkyInput } from "./sky-scene.ts";

function sky(patch: Partial<SkyInput> = {}): SkyInput {
  return {
    beacons: [{ id: "a", kind: "empty" }],
    here: "a",
    asteroid: false,
    asb: false,
    asbPhase: "warn",
    player: {},
    ...patch,
  };
}

describe("hazard backdrop", () => {
  it("is a quiet planet in open space", () => {
    const scene = skyScene(sky());
    assert.equal(scene.planet, true);
    assert.equal(scene.sun, false);
    assert.equal(scene.pulsar, false);
    assert.equal(scene.rocks, false);
    assert.equal(scene.storm, false);
    assert.equal(scene.nebula, false);
    assert.equal(scene.battery, false);
  });

  it("drifts rocks through an asteroid field, and thins them between waves", () => {
    assert.equal(skyScene(sky({ asteroid: true, asteroidPhase: "wave1" })).rocksQuiet, false);
    assert.equal(skyScene(sky({ asteroid: true, asteroidPhase: "break" })).rocksQuiet, true);
    assert.equal(skyScene(sky({ asteroid: true })).rocks, true);
  });

  it("puts a red giant in place of the planet, and strobes it during the flare warning", () => {
    const calm = skyScene(sky({ flare: true }));
    assert.equal(calm.sun, true);
    assert.equal(calm.planet, false);
    assert.equal(calm.sunWarn, false);
    assert.equal(skyScene(sky({ flare: true, flareWarned: true })).sunWarn, true);
  });

  it("spins a pulsar in place of the planet, and marks the ion warning", () => {
    const calm = skyScene(sky({ pulsar: true }));
    assert.equal(calm.pulsar, true);
    assert.equal(calm.planet, false);
    assert.equal(skyScene(sky({ pulsar: true, pulsarWarned: true })).pulsarWarn, true);
  });

  it("veils a live nebula and shows the planet again once that nebula is cleared", () => {
    const live = skyScene(sky({ beacons: [{ id: "a", kind: "nebula" }] }));
    assert.equal(live.nebula, true);
    assert.equal(live.planet, false);
    const cleared = skyScene(sky({ beacons: [{ id: "a", kind: "nebula", cleared: true }] }));
    assert.equal(cleared.nebula, false);
    assert.equal(cleared.planet, true);
  });

  it("rolls an ion storm over the planet, and over a nebula the fleet has overtaken", () => {
    const open = skyScene(sky({ player: { storm: true } }));
    assert.equal(open.storm, true);
    assert.equal(open.planet, true);
    const swallowed = skyScene(sky({ beacons: [{ id: "a", kind: "nebula" }], player: { storm: true } }));
    assert.equal(swallowed.storm, true);
    assert.equal(swallowed.nebula, true);
    assert.equal(swallowed.planet, false);
  });

  it("arms the planet while an anti-ship battery is aiming", () => {
    const warned = skyScene(sky({ asb: true, asbPhase: "warn" }));
    assert.equal(warned.battery, true);
    assert.equal(warned.batteryAiming, false);
    assert.equal(warned.planet, true);
    assert.equal(skyScene(sky({ asb: true, asbPhase: "shot" })).batteryAiming, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lowerCradlePower, raiseCradlePower } from "./extras/cradle.ts";
import { lowerSwarmPower, raiseSwarmPower } from "./extras/swarm.ts";
import { createGame, holdAutofire, jumpBlocked, powerDown, powerUp, pressJump, slotAutofire } from "./sim.ts";
import type { Kit } from "./types.ts";

function cradle(power = 0, level = 1): Kit {
  return { id: "cradle", level, power, left: 0, cool: 0, target: null, on: power > 0, aux: 0 };
}

function swarm(power = 0, level = 2): Kit {
  return { id: "swarm", level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

describe("Configure controls", () => {
  it("opens the beacon chart with J and closes it again", () => {
    const g = createGame(1);
    g.phase = "map";
    g.picking = false;
    pressJump(g);
    assert.equal(g.picking, true);
    pressJump(g);
    assert.equal(g.picking, false);
  });

  it("opens the chart in a fight only when the drive is ready", () => {
    const g = createGame(2);
    g.phase = "combat";
    g.flee = 0;
    g.picking = false;
    assert.equal(jumpBlocked(g), null);
    pressJump(g);
    assert.equal(g.picking, false);

    g.flee = 1;
    pressJump(g);
    assert.equal(g.picking, true);
    pressJump(g);
    assert.equal(g.picking, false);

    g.player.systems.engines.power = 0;
    pressJump(g);
    assert.equal(g.picking, false);
    assert.equal(jumpBlocked(g), "Engines are unpowered.");
  });

  it("leaves a weapon on autofire when Ctrl is held for the aim", () => {
    const g = createGame(3);
    const w = g.player.weapons[0];
    assert.ok(w);
    g.armed = w.uid;
    assert.equal(slotAutofire(g, w), false);
    holdAutofire(g);
    assert.equal(w.autoInvert, true);
    assert.equal(slotAutofire(g, w), true);
    holdAutofire(g);
    assert.equal(w.autoInvert, true);

    g.autofireAll = true;
    w.autoInvert = false;
    holdAutofire(g);
    assert.equal(w.autoInvert, false);
  });

  it("adds and removes one oxygen bar", () => {
    const g = createGame(4);
    g.player.reactor = 30;
    const ox = g.player.systems.oxygen;
    ox.level = 2;
    ox.power = 0;
    ox.damage = 0;
    powerUp(g, "oxygen");
    assert.equal(ox.power, 1);
    powerUp(g, "oxygen");
    assert.equal(ox.power, 2);
    powerDown(g, "oxygen");
    assert.equal(ox.power, 1);
  });

  it("gives Clone Bay one bar and Drone Control one bar at a time", () => {
    const g = createGame(5);
    g.player.reactor = 30;
    g.player.kits.cradle = cradle();
    raiseCradlePower(g);
    assert.equal(g.player.kits.cradle?.power, 1);
    assert.equal(g.player.kits.cradle?.on, true);
    raiseCradlePower(g);
    assert.equal(g.player.kits.cradle?.power, 1);
    lowerCradlePower(g);
    assert.equal(g.player.kits.cradle?.power, 0);
    assert.equal(g.player.kits.cradle?.on, false);

    g.player.kits.cradle = cradle(0);
    g.player.kits.cradle.damage = 1;
    raiseCradlePower(g);
    assert.equal(g.player.kits.cradle.power, 0);

    g.player.kits.swarm = swarm();
    raiseSwarmPower(g);
    assert.equal(g.player.kits.swarm?.power, 1);
    raiseSwarmPower(g);
    assert.equal(g.player.kits.swarm?.power, 2);
    raiseSwarmPower(g);
    assert.equal(g.player.kits.swarm?.power, 2);
    lowerSwarmPower(g);
    assert.equal(g.player.kits.swarm?.power, 1);
  });
});

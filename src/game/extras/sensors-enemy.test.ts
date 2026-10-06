// @agent:enemy-sensors. Enemy Sensors: the wiki documents no gameplay effect, so hacking them only does what every hack
// does. Sensors wiki, "Overview": "Enemy ships do not have Sensors subsystem, but have all the information about your
// ship and crew." Hacking wiki, "Overview": "Sensors: disable sensors."
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { enemyTarget } from "../wiki/targeting.ts";
import {
  enemySensorsHacked,
  hackRepairScale,
  installSpike,
  playerSensorLevel,
  tickSpike,
  toggleSpikePower,
} from "./spike.ts";
import type { Game } from "../types.ts";

function fight(seed = 7): Game {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.enemy.weapons = [];
  g.enemy.kits = {};
  g.enemy.zoltan = undefined;
  g.enemy.automated = false;
  g.scrap = 80;
  g.player.parts = 3;
  assert.equal(installSpike(g), true);
  toggleSpikePower(g);
  return g;
}

/** The player's drone latched on the enemy's Sensors with a 4 s pulse running. */
function pulseSensors(g: Game) {
  g.enemy!.hackDrone = "sensors";
  const k = g.player.kits.spike!;
  k.target = "sensors";
  k.on = true;
  k.left = 4;
  k.aux = 0;
}

describe("enemy sensors: hacking them", () => {
  it("flags the pulse while it runs, and clears once it ends", () => {
    const g = fight();
    assert.equal(enemySensorsHacked(g), false);
    pulseSensors(g);
    assert.equal(enemySensorsHacked(g), true);
    for (let t = 0; t < 4.5; t += 0.05) tickSpike(g, 0.05);
    assert.equal(enemySensorsHacked(g), false);
  });

  it("changes no enemy decision: room targeting draws the same rooms with or without the hack", () => {
    // "have all the information about your ship and crew": nothing on the enemy side reads its Sensors.
    const a = fight();
    const b = structuredClone(a);
    pulseSensors(b);
    // The pulse flag itself draws no randomness, so both games stay in lockstep.
    assert.equal(a.seed, b.seed);
    const pickA = Array.from({ length: 30 }, () => enemyTarget(a, null));
    const pickB = Array.from({ length: 30 }, () => enemyTarget(b, null));
    assert.deepEqual(pickB, pickA);
  });

  it("leaves the player's own Sensors untouched", () => {
    const g = fight();
    const before = playerSensorLevel(g);
    pulseSensors(g);
    assert.equal(playerSensorLevel(g), before);
  });

  it("still gets the generic drone passive: their Sensors repair at half speed", () => {
    // Hacking wiki, "Overview" (passive effects): "Repair speed of the system is halved."
    const g = fight();
    assert.equal(hackRepairScale(g, g.enemy!, "sensors"), 1);
    pulseSensors(g);
    assert.equal(hackRepairScale(g, g.enemy!, "sensors"), 0.5);
  });
});

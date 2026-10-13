// @agent:hack-ui. The player's Hacking controls: aim, launch, pulse, and the "this choice is permanent" rule.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import {
  armSpike,
  hackVision,
  installSpike,
  launchSpike,
  lowerSpikePower,
  playerHackView,
  raiseSpikePower,
  spikeRoomTargetable,
  tickSpike,
} from "./spike.ts";
import type { Game } from "../types.ts";

/**
 * @agent:hack-rules. Hacking wiki, "Choosing your hacking target": the drone "takes about 2--3 seconds to reach the
 * enemy ship". launchSpike now starts that flight; these pulse checks land it at once.
 */
function launchLanded(g: Game): boolean {
  const ok = launchSpike(g);
  const kit = g.player.kits.spike;
  if (ok && kit && kit.hackFly != null) {
    kit.hackFly = 0;
    tickSpike(g, 1e-6);
  }
  return ok;
}


/** A fight with level-2 Hacking powered at 1, no enemy hacking, and `parts` drone parts. */
function fight(parts = 2): Game {
  const g = createGame(11);
  g.scrap = 80;
  g.player.parts = parts;
  assert.equal(installSpike(g), true);
  g.player.kits.spike!.level = 2;
  raiseSpikePower(g);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.enemy.kits = {};
  g.enemy.zoltan = undefined;
  g.enemy.weapons = [];
  return g;
}

function roomFor(g: Game, sys: string): string {
  const room = g.enemy!.rooms.find((r) => r.system === sys);
  assert.ok(room, `enemy has a ${sys} room`);
  return room.id;
}

describe("spike UI", () => {
  it("power buttons step one bar within level and reactor", () => {
    const g = fight();
    const kit = g.player.kits.spike!;
    assert.equal(kit.power, 1);
    g.player.reactor += 4;
    raiseSpikePower(g);
    assert.equal(kit.power, 2);
    raiseSpikePower(g);
    assert.equal(kit.power, 2, "capped at level 2");
    lowerSpikePower(g);
    lowerSpikePower(g);
    lowerSpikePower(g);
    assert.equal(kit.power, 0);
    // Hacking wiki, "Choosing your hacking target": "With power in the hacking system, click on the hacking drone icon".
    assert.equal(playerHackView(g)?.state, "nopower");
  });

  it("only system rooms the drone can lock are targetable", () => {
    const g = fight();
    assert.equal(spikeRoomTargetable(g, roomFor(g, "shields")), true);
    assert.equal(spikeRoomTargetable(g, roomFor(g, "weapons")), true);
    const bare = g.enemy!.rooms.find((r) => !r.system && !r.kit);
    if (bare) assert.equal(spikeRoomTargetable(g, bare.id), false);
    assert.equal(spikeRoomTargetable(g, "no-such-room"), false);
    // Hacking wiki, "Overview": "A destroyed system cannot be actively hacked".
    const shields = g.enemy!.systems.shields;
    shields.damage = shields.level;
    assert.equal(spikeRoomTargetable(g, roomFor(g, "shields")), false);
    assert.equal(armSpike(g, "shields"), false);
  });

  it("walks ready -> pulse -> cooldown -> latched, with the part spent once", () => {
    const g = fight(2);
    const v0 = playerHackView(g)!;
    assert.equal(v0.state, "ready");
    assert.equal(v0.cost, 1);
    assert.equal(v0.pulse, 4, "1 bar: 4 second pulse (Overview, Hacking pulse)");
    assert.equal(armSpike(g, "shields"), true);
    assert.equal(launchLanded(g), true);
    assert.equal(g.player.parts, 1);
    const v1 = playerHackView(g)!;
    assert.equal(v1.state, "pulse");
    assert.equal(v1.latched, true);
    assert.equal(v1.room, roomFor(g, "shields"));
    tickSpike(g, 4);
    assert.equal(playerHackView(g)!.state, "cooldown");
    assert.equal(playerHackView(g)!.cool, 20);
    tickSpike(g, 20);
    assert.equal(playerHackView(g)!.state, "latched");
    // The pulse control: the latched drone pulses again for no new part.
    assert.equal(launchLanded(g), true);
    assert.equal(g.player.parts, 1);
    assert.equal(playerHackView(g)!.state, "pulse");
  });

  it("this choice is permanent until the drone is destroyed", () => {
    // Hacking wiki, "Choosing your hacking target": "this choice is permanent: you can only hack one system in a fight,
    // unless your hacking drone is somehow destroyed."
    const g = fight(3);
    armSpike(g, "weapons");
    assert.equal(launchLanded(g), true);
    tickSpike(g, 24);
    assert.equal(armSpike(g, "shields"), false);
    assert.equal(g.player.kits.spike!.target, "weapons");
    // A stale target set behind the UI's back is pulled back to the latch: no second drone, no part spent.
    g.player.kits.spike!.target = "shields";
    assert.equal(launchLanded(g), true);
    assert.equal(g.enemy!.hackDrone, "weapons");
    assert.equal(g.player.parts, 2);
    tickSpike(g, 24);
    delete g.enemy!.hackDrone;
    assert.equal(armSpike(g, "shields"), true);
    assert.equal(launchLanded(g), true);
    assert.equal(g.enemy!.hackDrone, "shields");
    assert.equal(g.player.parts, 1);
  });

  it("Zoltan Shield, cloak, and empty parts each block the launch", () => {
    // "If the enemy has a Zoltan Shield, you must destroy it first; if they are cloaked, you must wait for the cloak to end."
    const z = fight(2);
    z.enemy!.zoltan = 4;
    assert.equal(playerHackView(z)!.state, "zoltan");
    armSpike(z, "shields");
    assert.equal(launchLanded(z), false);
    assert.equal(z.player.parts, 2, "no part spent at a Zoltan Shield");

    const c = fight(2);
    c.enemy!.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    assert.equal(playerHackView(c)!.state, "cloaked");
    armSpike(c, "shields");
    assert.equal(launchLanded(c), false);
    assert.equal(c.player.parts, 2, "no part spent while they are cloaked");
    assert.equal(c.enemy!.hackDrone, undefined);

    const p = fight(0);
    assert.equal(playerHackView(p)!.state, "noparts");
  });

  it("a powered drone on Piloting or Engines reveals enemy evasion", () => {
    // "If the targeted system is Piloting or Engines, the ship name on the top right corner is replaced with text that
    // states the current Evasion of the enemy ship."
    const g = fight(2);
    armSpike(g, "engines");
    launchLanded(g);
    const seen = hackVision(g);
    assert.ok(seen);
    assert.equal(seen.system, "engines");
    assert.equal(typeof seen.evasion, "number");
    lowerSpikePower(g);
    assert.equal(hackVision(g)!.evasion, null, "only while the Hacking system is powered");
  });
});

// @agent:hack-rules. Player Hacking rules: the paused launch queue, the drone's flight, and the full target list.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import {
  cancelQueuedSpike,
  enemySensorsHacked,
  hackPulseOn,
  installSpike,
  launchEnemySpike,
  launchSpike,
  playerHackView,
  queueSpike,
  spikeRoomTargetable,
  armSpike,
  tickEnemySpike,
  tickSpike,
  toggleSpikePower,
} from "./spike.ts";
import { sideOf } from "./leash.ts";
import type { Game, Kit, KitId } from "../types.ts";

function kit(id: KitId, level: number, power = level): Kit {
  return { id, level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

/** A fight with a gunless enemy and a powered level-1 player Hacking kit. */
function fight(seed = 5, parts = 3): Game {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.enemy.weapons = [];
  g.enemy.kits = {};
  g.enemy.zoltan = undefined;
  g.enemy.automated = false;
  g.scrap = 80;
  g.player.parts = parts;
  assert.equal(installSpike(g), true);
  toggleSpikePower(g);
  return g;
}

/** Adds an enemy room housing kit `id` (as enemy-gen.ts does) and the kit itself. */
function fit(g: Game, id: KitId, level = 2, extra: Partial<Kit> = {}): Kit {
  const base = g.enemy!.rooms[0];
  g.enemy!.rooms.push({ ...base, id: `e-${id}`, title: id, system: null, kit: id, x: 20 + g.enemy!.rooms.length, y: 0 });
  const k = { ...kit(id, level), ...extra };
  g.enemy!.kits[id] = k;
  return k;
}

/** The player's drone latched on `id` with a 4 s pulse running (what arriveOwn leaves behind). */
function pulsing(g: Game, id: string) {
  g.enemy!.hackDrone = id;
  const k = g.player.kits.spike!;
  k.target = id;
  k.on = true;
  k.left = 4;
  k.aux = 0;
}

function flyAll(g: Game, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds - 1e-9; t += dt) tickSpike(g, dt);
}

describe("hack rules: paused grace window", () => {
  it("a pick while paused only queues: no part, cancellable, re-pickable, committed on unpause", () => {
    const g = fight();
    g.paused = true;
    assert.equal(queueSpike(g, "shields"), true);
    assert.equal(g.player.parts, 3);
    assert.equal(playerHackView(g)?.state, "queued");
    // Paused steps never run the sim (sim.ts step), so nothing launches.
    step(g, 0.5);
    assert.equal(g.player.parts, 3);
    assert.equal(g.enemy!.hackFlying, undefined);
    // "you can cancel the hack launch by clicking on the drone icon again"
    assert.equal(cancelQueuedSpike(g), true);
    assert.equal(playerHackView(g)?.state, "ready");
    assert.equal(cancelQueuedSpike(g), false);
    // Change of mind: a new pick re-aims the queue.
    assert.equal(queueSpike(g, "weapons"), true);
    assert.equal(queueSpike(g, "engines"), true);
    assert.equal(playerHackView(g)?.label, "Engines");
    // "Once the game is unpaused, this choice is permanent"
    g.paused = false;
    tickSpike(g, 0.05);
    assert.equal(g.player.parts, 2);
    assert.equal(g.enemy!.hackFlying, "engines");
    assert.equal(playerHackView(g)?.state, "flying");
    assert.equal(armSpike(g, "shields"), false);
    assert.equal(queueSpike(g, "shields"), false);
  });
});

describe("hack rules: drone flight", () => {
  it("takes 2-3 s to latch, then pulses; no second drone meanwhile", () => {
    const g = fight();
    assert.equal(armSpike(g, "shields"), true);
    assert.equal(launchSpike(g), true);
    assert.equal(g.enemy!.hackDrone, undefined);
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, 2);
    flyAll(g, 1.95);
    assert.equal(g.enemy!.hackDrone, undefined);
    const mid = playerHackView(g)!;
    assert.equal(mid.state, "flying");
    assert.ok(mid.progress > 0.6 && mid.progress < 1, String(mid.progress));
    flyAll(g, 1.1);
    assert.equal(g.enemy!.hackDrone, "shields");
    assert.equal(g.enemy!.hackFlying, undefined);
    assert.equal(g.player.kits.spike!.on, true);
    assert.equal(playerHackView(g)?.state, "pulse");
  });

  it("de-powering freezes the drone in place", () => {
    const g = fight();
    armSpike(g, "oxygen");
    launchSpike(g);
    const k = g.player.kits.spike!;
    const before = k.hackFly;
    k.power = 0;
    flyAll(g, 5);
    assert.equal(k.hackFly, before);
    assert.equal(playerHackView(g)?.stunned, false);
    k.power = 1;
    flyAll(g, 3.1);
    assert.equal(g.enemy!.hackDrone, "oxygen");
  });

  it("an enemy Anti-Combat Drone shoots it down or stuns it; a lost drone relaunches after a short delay", () => {
    let down = 0;
    let stun = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const g = fight(seed);
      const swarm = fit(g, "swarm", 2);
      swarm.drones = [{ id: "cut", kind: "wardcut", alive: true, powered: true, aux: 0, cool: 0 }];
      armSpike(g, "weapons");
      launchSpike(g);
      tickSpike(g, 0.05);
      const k = g.player.kits.spike!;
      if (g.enemy!.hackFlying == null) {
        down += 1;
        assert.ok(k.cool > 4.9 && k.cool <= 5, String(k.cool));
        assert.equal(playerHackView(g)?.state, "cooldown");
        flyAll(g, 5.05);
        assert.equal(playerHackView(g)?.state, "ready");
        assert.equal(armSpike(g, "shields"), true);
      } else {
        stun += 1;
        assert.equal(k.stun, 5);
        assert.equal(playerHackView(g)?.stunned, true);
        const held = k.hackFly;
        tickSpike(g, 1);
        assert.equal(k.hackFly, held);
      }
    }
    assert.ok(down > 0 && stun > 0, `${down} / ${stun}`);
  });

  it("holds in space while the enemy is cloaked, then finishes the flight", () => {
    // Cloaking, Overview: hacking drones hold their position in space until the cloak is over.
    const g = fight();
    assert.equal(armSpike(g, "shields"), true);
    assert.equal(launchSpike(g), true);
    const k = g.player.kits.spike!;
    const before = k.hackFly;
    g.enemy!.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    flyAll(g, 1);
    assert.equal(k.hackFly, before);
    assert.equal(g.enemy!.hackDrone, undefined);
    g.enemy!.kits.veil.on = false;
    g.enemy!.kits.veil.left = 0;
    flyAll(g, 3.1);
    assert.equal(g.enemy!.hackDrone, "shields");
  });

  it("holds an enemy hacking drone while the player is cloaked", () => {
    const g = fight();
    g.enemy!.parts = 3;
    g.enemy!.kits.spike = { id: "spike", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    assert.equal(launchEnemySpike(g), true);
    const k = g.enemy!.kits.spike!;
    const before = k.hackFly;
    assert.ok(before != null && before > 0);
    g.player.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    tickEnemySpike(g, 1);
    assert.equal(k.hackFly, before);
    assert.equal(k.hackLatched, undefined);
    g.player.kits.veil.on = false;
    g.player.kits.veil.left = 0;
    tickEnemySpike(g, 3.1);
    assert.equal(k.hackLatched, true);
  });

  it("a Zoltan Shield raised during the flight breaks the drone on impact", () => {
    const g = fight();
    armSpike(g, "shields");
    launchSpike(g);
    g.enemy!.zoltan = 5;
    flyAll(g, 3.1);
    assert.equal(g.enemy!.hackDrone, undefined);
    assert.equal(g.enemy!.zoltan, 5);
    assert.equal(g.player.kits.spike!.cool > 0, true);
  });
});

describe("hack rules: every listed target", () => {
  it("Sensors and every fitted subsystem room can be picked; unfitted kits cannot", () => {
    const g = fight();
    assert.equal(armSpike(g, "veil"), false);
    for (const id of ["veil", "sling", "leash", "swarm", "cell", "cradle", "spike", "flak"] as KitId[]) fit(g, id, 1);
    for (const id of ["veil", "sling", "leash", "swarm", "cell", "cradle", "spike", "flak"]) {
      assert.equal(spikeRoomTargetable(g, `e-${id}`), true, id);
    }
    const sensors = g.enemy!.rooms.find((r) => r.system === "sensors");
    if (sensors) assert.equal(spikeRoomTargetable(g, sensors.id), true);
    assert.equal(armSpike(g, "sensors"), true);
  });

  it("Sensors: disable sensors; artillery: drains charge", () => {
    const g = fight();
    fit(g, "flak", 1);
    pulsing(g, "sensors");
    assert.equal(enemySensorsHacked(g), true);
    pulsing(g, "flak");
    assert.equal(hackPulseOn(g, g.enemy!, "flak"), true);
  });

  it("Cloaking: ends an active cloak and prevents a new one", () => {
    const g = fight();
    const veil = fit(g, "veil", 1);
    armSpike(g, "veil");
    // Hacking: "if they are cloaked, you must wait for the cloak to end" is the launch.
    // Cloaking, Overview: a drone already in space holds, so this latch happens after the cloak is down.
    assert.equal(launchSpike(g), true);
    flyAll(g, 3.1);
    assert.equal(g.enemy!.hackDrone, "veil");
    veil.on = true;
    veil.left = 10;
    tickSpike(g, 0.05);
    assert.equal(veil.on, false);
    assert.equal(veil.left, 0);
    veil.on = true;
    veil.left = 5;
    tickSpike(g, 0.05);
    assert.equal(veil.on, false);
  });

  it("Cloaking: a cloak turned on during the pulse ends on the full 20 second cooldown", () => {
    const g = fight();
    const veil = fit(g, "veil", 1);
    pulsing(g, "veil");
    veil.on = true;
    veil.left = 5;
    veil.cool = 0;
    tickSpike(g, 0.05);
    assert.equal(veil.on, false);
    assert.equal(veil.left, 0);
    assert.equal(veil.cool, 20);
    veil.on = false;
    veil.cool = 0;
    tickSpike(g, 0.05);
    assert.equal(veil.cool, 0);
  });

  it("Backup Battery: shuts it down onto cooldown and drains two bars for the pulse", () => {
    const g = fight();
    const cell = fit(g, "cell", 1, { on: true, left: 10 });
    pulsing(g, "cell");
    tickSpike(g, 0.1);
    assert.equal(cell.on, false);
    assert.equal(cell.cool, 20);
    assert.equal(cell.drained, 2);
    tickSpike(g, 4);
    assert.equal(cell.drained, undefined);
  });

  it("Drone Control: stuns their drones and may destroy them", () => {
    let burned = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const g = fight(seed);
      const swarm = fit(g, "swarm", 2);
      swarm.drones = [
        { id: "a", kind: "striker", alive: true, powered: true, aux: 0, cool: 0 },
        { id: "b", kind: "ward", alive: true, powered: true, aux: 0, cool: 0 },
      ];
      pulsing(g, "swarm");
      tickSpike(g, 0.05);
      for (const u of swarm.drones) assert.ok((u.stun ?? 0) > 3);
      flyAll(g, 4);
      burned += swarm.drones.filter((u) => !u.alive).length;
    }
    // 15% a second after the first second, per drone: about 39% each over a 4 s pulse.
    assert.ok(burned > 4 && burned < 30, String(burned));
  });

  it("Mind Control: turns one enemy for the pulse and frees allies they hold", () => {
    const g = fight();
    fit(g, "leash", 1);
    const mine = g.crew.find((c) => c.side === "player")!;
    mine.leashed = 10;
    pulsing(g, "leash");
    tickSpike(g, 0.05);
    assert.equal((mine.leashed ?? 0) > 0, false);
    const turned = g.crew.find((c) => c.id === g.player.kits.spike!.hackHeld)!;
    assert.ok(turned);
    assert.equal(turned.side, "enemy");
    assert.equal(sideOf(turned), "player");
    flyAll(g, 4.1);
    assert.equal(sideOf(turned), "enemy");
    assert.equal(g.player.kits.spike!.hackHeld, undefined);
  });

  it("Crew Teleporter: recalls their boarders and cools the teleporter", () => {
    const g = fight();
    const sling = fit(g, "sling", 1);
    const foe = g.crew.find((c) => c.side === "enemy")!;
    foe.aboard = "player";
    foe.room = g.player.rooms[0].id;
    pulsing(g, "sling");
    tickSpike(g, 0.05);
    assert.equal(foe.aboard, "enemy");
    assert.equal(foe.room, "e-sling");
    assert.equal(sling.cool, 20);
  });
});

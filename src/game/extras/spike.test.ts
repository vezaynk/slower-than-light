import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import { WEAPONS } from "../content.ts";
import type { Game } from "../types.ts";
import {
  armSpike,
  installSpike,
  launchSpike,
  spikeEvadeZero,
  spikeFreezesFtl,
  tickSpike,
  toggleSpikePower,
} from "./spike.ts";

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


function armed(parts = 2) {
  const g = createGame(2);
  g.scrap = 80;
  g.player.parts = parts;
  assert.equal(installSpike(g), true);
  assert.equal(g.player.kits.spike?.level, 1);
  toggleSpikePower(g);
  assert.equal(g.player.kits.spike?.power, 1);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  return g;
}

describe("spike", () => {
  it("spends a part, pulses shields for 4s, and drops one bubble after 2s", () => {
    const g = armed(2);
    armSpike(g, "shields");
    assert.equal(launchLanded(g), true);
    assert.equal(g.player.parts, 1);
    assert.equal(g.player.kits.spike?.left, 4);
    assert.equal(g.player.kits.spike?.on, true);
    g.enemy!.shieldNow = 2;
    tickSpike(g, 2);
    assert.equal(g.enemy!.shieldNow, 1);
    assert.equal(g.player.kits.spike?.left, 2);

    g.player.parts = 0;
    const left = g.player.kits.spike?.left;
    assert.equal(launchLanded(g), false);
    assert.equal(g.player.parts, 0);
    assert.equal(g.player.kits.spike?.left, left);
  });

  it("does not launch with zero parts or zero power", () => {
    const dry = armed(0);
    armSpike(dry, "shields");
    assert.equal(launchLanded(dry), false);
    assert.equal(dry.player.parts, 0);
    assert.equal(dry.player.kits.spike?.left, 0);

    const cold = createGame(3);
    cold.scrap = 80;
    cold.player.parts = 2;
    installSpike(cold);
    startCombat(cold, "scout");
    armSpike(cold, "shields");
    assert.equal(cold.player.kits.spike?.power, 0);
    assert.equal(launchLanded(cold), false);
    assert.equal(cold.player.parts, 2);
  });

  it("cools for 20s after the pulse and can lock engines or pilot", () => {
    const g = armed(2);
    armSpike(g, "engines");
    assert.equal(launchLanded(g), true);
    assert.equal(spikeFreezesFtl(g), true);
    assert.equal(spikeEvadeZero(g, g.enemy!), true);
    assert.equal(spikeEvadeZero(g, g.player), false);
    tickSpike(g, 4);
    assert.equal(g.player.kits.spike?.left, 0);
    assert.equal(g.player.kits.spike?.on, false);
    assert.equal(g.player.kits.spike?.cool, 20);
    assert.equal(spikeFreezesFtl(g), false);
    tickSpike(g, 20);
    assert.equal(g.player.kits.spike?.cool, 0);

    // Hacking wiki, "Choosing your hacking target": "this choice is permanent: you can only hack one system in a
    // fight, unless your hacking drone is somehow destroyed." This test used to retarget freely; now the latched
    // drone pins Engines, and Piloting is only reachable after the drone is gone.
    assert.equal(armSpike(g, "pilot"), false);
    assert.equal(g.player.kits.spike?.target, "engines");
    delete g.enemy!.hackDrone;
    assert.equal(armSpike(g, "pilot"), true);
    assert.equal(launchLanded(g), true);
    assert.equal(g.player.parts, 0);
    assert.equal(spikeFreezesFtl(g), true);
    assert.equal(g.player.kits.spike?.left, 4);
  });

  it("drains weapons, air, medbay crew, and interior doors only", () => {
    const g = armed(2);
    const enemy = g.enemy!;
    for (const w of enemy.weapons) w.charge = 1;
    armSpike(g, "weapons");
    launchLanded(g);
    tickSpike(g, 1);
    for (const w of enemy.weapons) {
      const seconds = WEAPONS[w.defId]?.charge ?? 1;
      const left = Math.min(0.99, 1 - 1 / seconds);
      assert.ok(w.charge <= 0.99);
      assert.ok(Math.abs(w.charge - left) < 1e-9);
    }

    tickSpike(g, 3);
    assert.equal(g.player.kits.spike?.cool, 20);
    tickSpike(g, 20);

    for (const room of enemy.rooms) room.o2 = 100;
    delete enemy.hackDrone; // "unless your hacking drone is somehow destroyed": frees the permanent target.
    armSpike(g, "oxygen");
    g.player.parts = 1;
    assert.equal(launchLanded(g), true);
    tickSpike(g, 1);
    for (const room of enemy.rooms) assert.ok(Math.abs(room.o2 - 94) < 1e-9);
    tickSpike(g, 3);
    tickSpike(g, 20);

    enemy.rooms.push({
      id: "e-medbay",
      title: "Medbay",
      system: "medbay",
      x: 0,
      y: 2,
      w: 1,
      h: 1,
      o2: 100,
      fire: 0,
      breach: 0,
      breachFix: 0,
      fireTick: 0,
      flash: 0,
      venting: false,
    });
    const foe = g.crew.find((c) => c.side === "enemy");
    assert.ok(foe);
    foe.room = "e-medbay";
    foe.hp = 100;
    const friend = g.crew.find((c) => c.side === "player");
    assert.ok(friend);
    friend.room = "e-medbay";
    friend.aboard = "enemy";
    const friendHp = friend.hp;
    delete enemy.hackDrone; // "unless your hacking drone is somehow destroyed": frees the permanent target.
    armSpike(g, "medbay");
    g.player.parts = 1;
    launchLanded(g);
    tickSpike(g, 1);
    assert.ok(Math.abs(foe.hp - 87) < 1e-9);
    assert.equal(friend.hp, friendHp);
    tickSpike(g, 3);
    tickSpike(g, 20);

    const interior = enemy.doors.find((d) => d.b !== "void");
    const airlock = enemy.doors.find((d) => d.b === "void");
    const stuck = enemy.doors.find((d) => d.b !== "void" && d !== interior);
    assert.ok(interior && airlock && stuck);
    interior.open = true;
    airlock.open = true;
    stuck.open = true;
    stuck.stuck = 3;
    delete enemy.hackDrone; // "unless your hacking drone is somehow destroyed": frees the permanent target.
    armSpike(g, "doors");
    g.player.parts = 1;
    launchLanded(g);
    tickSpike(g, 0.5);
    assert.equal(interior.open, false);
    assert.equal(airlock.open, true);
    assert.equal(stuck.open, true);
  });
});

describe("flagship artillery hack", () => {
  it("drains the aimed gun and leaves the other artillery charging", () => {
    const g = createGame(2);
    g.scrap = 80;
    g.player.parts = 2;
    assert.equal(installSpike(g), true);
    toggleSpikePower(g);
    const boss = g.beacons.find((beacon) => beacon.kind === "exit");
    assert.ok(boss);
    boss.kind = "boss";
    g.here = boss.id;
    startCombat(g, "boss");
    const enemy = g.enemy;
    assert.ok(enemy?.flagship);
    assert.equal(armSpike(g, "weapons"), false);
    assert.equal(armSpike(g, "e-laser"), true);
    assert.equal(launchLanded(g), true);
    assert.equal(g.player.kits.spike?.target, "e-laser");
    for (const w of enemy.weapons) w.charge = 0.4;
    const before = Object.fromEntries(enemy.weapons.map((w) => [w.defId, w.charge]));
    for (let i = 0; i < 10; i++) step(g, 0.05);
    const laser = enemy.weapons.find((w) => w.defId === "bosslaser");
    assert.ok(laser);
    assert.ok(laser.charge < (before.bosslaser ?? 1), String(laser.charge));
    for (const w of enemy.weapons) {
      if (w.defId === "bosslaser") continue;
      assert.ok(w.charge > (before[w.defId] ?? 0), `${w.defId} ${w.charge}`);
    }
  });
});

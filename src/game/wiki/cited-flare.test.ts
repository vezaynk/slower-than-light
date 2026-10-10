import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFlarePulse, createGame, startCombat, step } from "../sim.ts";
import type { Game, SysId } from "../types.ts";
import { eventHasFlare, flareCycleSeconds, flareDamagesRoom, flareFireCount, placeFlareFires } from "./cited-flare.ts";

function fires(g: Game, side: "player" | "enemy"): number {
  const ship = side === "player" ? g.player : g.enemy;
  if (!ship) return 0;
  return ship.rooms.reduce((sum, room) => sum + room.fire, 0);
}

function clearFires(g: Game) {
  for (const room of g.player.rooms) room.fire = 0;
  for (const room of g.enemy?.rooms ?? []) room.fire = 0;
}

function systemDamage(g: Game): number {
  return (Object.keys(g.player.systems) as SysId[]).reduce((sum, id) => sum + g.player.systems[id].damage, 0);
}

function quietEnemy(g: Game) {
  const enemy = g.enemy;
  if (!enemy) return;
  for (const w of enemy.weapons) w.enabled = false;
  if (enemy.kits.swarm) enemy.kits.swarm.loadout = [];
}

describe("solar flare", () => {
  it("arms only a red-giant fight, on a cycle of 28 to 34 seconds", () => {
    assert.equal(eventHasFlare("pirate-fight-near-sun"), true);
    assert.equal(eventHasFlare("auto-ship-fight-near-sun"), true);
    assert.equal(eventHasFlare("mantis-fight-near-sun"), true);
    assert.equal(eventHasFlare("rock-pirates-fight-near-sun"), true);
    assert.equal(eventHasFlare("pirate-fight-near-pulsar"), false);
    assert.equal(flareCycleSeconds(0), 28);
    assert.ok(flareCycleSeconds(0.999) < 34);

    const plain = createGame(1);
    startCombat(plain, "Pirate ship");
    assert.equal(plain.flare, false);

    const g = createGame(4);
    startCombat(g, "Pirate ship", false, "pirate-fight-near-sun");
    assert.equal(g.flare, true);
    assert.ok((g.flareWait ?? 0) >= 28 && (g.flareWait ?? 0) < 34);
  });

  it("arms the Rock war vessel Sun Quest Marker as a red-giant fight", () => {
    // INFERRED: the Sun Quest Marker fight's event slug is "quest-rock-sun".
    assert.equal(eventHasFlare("quest-rock-sun"), true);
    const g = createGame(11);
    startCombat(g, "Rock Assault (Elite)", false, "quest-rock-sun");
    assert.equal(g.flare, true);
  });

  it("warns 5 seconds ahead, then flares", () => {
    const g = createGame(8);
    startCombat(g, "Pirate ship", false, "mantis-fight-near-sun");
    quietEnemy(g);
    g.flareWait = 6;
    g.flareT = 0;
    g.flareWarned = false;
    let t = 0;
    while (!g.flareWarned && t < 3) {
      step(g, 0.05);
      t += 0.05;
    }
    assert.equal(g.phase, "combat");
    assert.equal(g.flareWarned, true);
    assert.ok(t >= 1 && t < 1.1);
    assert.equal(g.log[0], "Solar flares will light the ship on fire. Shields will reduce the effect.");
    while (g.flareWarned && t < 8) {
      step(g, 0.05);
      t += 0.05;
    }
    assert.equal(g.flareWarned, false);
    assert.ok(t >= 6 && t < 6.1);
    assert.ok((g.flareWait ?? 0) >= 28 && (g.flareWait ?? 0) < 34);
    assert.ok(g.log.some((line) => line.startsWith("A solar flare lights")));
  });

  it("starts 1 or 2 fires when shields or a Zoltan Shield are up, and 3 to 6 when they are down", () => {
    for (let i = 0; i < 20; i++) {
      const up = flareFireCount(true, i / 20);
      assert.ok(up === 1 || up === 2);
      const down = flareFireCount(false, i / 20);
      assert.ok(down >= 3 && down <= 6);
    }
    assert.equal(flareFireCount(true, 0), 1);
    assert.equal(flareFireCount(true, 0.5), 2);
    assert.equal(flareFireCount(false, 0), 3);
    assert.equal(flareFireCount(false, 0.999), 6);

    const g = createGame(3);
    startCombat(g, "scout");
    g.player.shieldNow = 4;
    g.player.zoltan = 0;
    clearFires(g);
    const crew = g.crew.map((c) => c.hp);
    applyFlarePulse(g);
    const shielded = fires(g, "player");
    assert.ok(shielded === 1 || shielded === 2);
    assert.equal(g.player.shieldNow, 4);
    assert.deepEqual(g.crew.map((c) => c.hp), crew);

    clearFires(g);
    g.player.shieldNow = 0;
    g.player.zoltan = 1;
    applyFlarePulse(g);
    const bubble = fires(g, "player");
    assert.ok(bubble === 1 || bubble === 2);
    assert.equal(g.player.zoltan, 1);

    clearFires(g);
    g.player.zoltan = 0;
    applyFlarePulse(g);
    const open = fires(g, "player");
    assert.ok(open >= 3 && open <= 6);
  });

  it("deals 1 hull and 1 system damage on the printed chance, and spawns 1 or 2 fires per random room pick", () => {
    assert.equal(flareDamagesRoom(1, 0.32), true);
    assert.equal(flareDamagesRoom(1, 0.33), false);
    assert.equal(flareDamagesRoom(2, 0.65), true);
    assert.equal(flareDamagesRoom(2, 0.66), false);
    // xftl doc/solar-flares: a room can be picked again, and the last fire left is always a single.
    assert.deepEqual(placeFlareFires(5, 2, () => 0), [
      { room: 0, fires: 1 },
      { room: 0, fires: 1 },
      { room: 0, fires: 1 },
      { room: 0, fires: 1 },
      { room: 0, fires: 1 },
    ]);
    assert.deepEqual(placeFlareFires(3, 4, () => 0.75), [
      { room: 3, fires: 2 },
      { room: 3, fires: 1 },
    ]);

    let hurt = false;
    for (let seed = 1; seed < 40 && !hurt; seed++) {
      const g = createGame(seed);
      startCombat(g, "scout");
      g.player.shieldNow = 0;
      g.player.zoltan = 0;
      g.player.systems.engines.power = 0;
      clearFires(g);
      const hull = g.player.hull;
      const before = systemDamage(g);
      applyFlarePulse(g);
      const dropped = hull - g.player.hull;
      const systems = systemDamage(g) - before;
      const lit = g.player.rooms.filter((room) => room.fire > 0).length;
      assert.ok(dropped <= lit);
      assert.ok(systems <= lit);
      assert.ok(dropped <= 6);
      hurt = dropped > 0 && systems > 0;
    }
    assert.equal(hurt, true);
  });
});

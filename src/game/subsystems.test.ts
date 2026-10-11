import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, createGame, evasionPercent, ftlSeconds, jumpBlocked, manning, startCombat, step } from "./sim.ts";
import { sensorLevel } from "./extras/sensors.ts";
import type { Game } from "./types.ts";

function calm(g: Game) {
  g.player.weapons = [];
  if (g.enemy) g.enemy.weapons = [];
  g.enemyEscape = null;
  g.enemySurrender = null;
  g.asb = false;
  g.asteroid = false;
  g.boardTimer = 0;
  for (const c of g.crew) c.path = [];
}

function fight(seed = 1): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  calm(g);
  return g;
}

function pilotOf(g: Game) {
  const c = g.crew.find((x) => x.side === "player" && x.room === "p-pilot");
  assert.ok(c);
  return c;
}

function jumpTarget(g: Game): string {
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here && here.links[0]);
  g.fuel = 3;
  return here.links[0];
}

describe("piloting presence", () => {
  // Piloting, "Overview": "Stunned or mind-controlled ship crew and crew drones do not count towards the crew presence
  // in the Piloting."
  it("does not count a stunned pilot for evasion or the FTL charge", () => {
    const g = fight(2);
    assert.ok(evasionPercent(g, g.player, "player") > 0);
    assert.notEqual(ftlSeconds(g, g.player), null);
    pilotOf(g).stun = 5;
    assert.equal(evasionPercent(g, g.player, "player"), 0);
    assert.equal(ftlSeconds(g, g.player), null);
  });

  it("does not count a mind-controlled body in the Piloting room", () => {
    const g = fight(3);
    const pilot = pilotOf(g);
    pilot.room = "p-medbay";
    assert.equal(ftlSeconds(g, g.player), null);
    const foe = g.crew.find((c) => c.side === "enemy");
    assert.ok(foe);
    foe.aboard = "player";
    foe.room = "p-pilot";
    foe.path = [];
    foe.leashed = 20;
    assert.equal(ftlSeconds(g, g.player), null);
    assert.equal(evasionPercent(g, g.player, "player"), 0);
  });

  // Piloting, "Overview": crew in the room and powered engines are required for "charging the FTL Drive and making an
  // FTL Jump". Systems: a system with every level damaged is not functional.
  it("stops the FTL charge when Piloting is destroyed", () => {
    const g = fight(4);
    const before = g.flee;
    g.player.systems.pilot.damage = g.player.systems.pilot.level;
    assert.equal(ftlSeconds(g, g.player), null);
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.equal(g.flee, before);
  });

  it("refuses a map jump with no pilot, destroyed Piloting, or unpowered engines", () => {
    const g = createGame(5);
    const to = jumpTarget(g);
    const pilot = pilotOf(g);
    pilot.room = "p-medbay";
    assert.equal(jumpBlocked(g), "Nobody is piloting.");
    commitJump(g, to);
    assert.equal(g.jumps, 0);
    pilot.room = "p-pilot";

    g.player.systems.pilot.damage = 1;
    assert.equal(jumpBlocked(g), "Piloting is down.");
    commitJump(g, to);
    assert.equal(g.jumps, 0);
    g.player.systems.pilot.damage = 0;

    g.player.systems.engines.power = 0;
    assert.equal(jumpBlocked(g), "Engines are unpowered.");
    commitJump(g, to);
    assert.equal(g.jumps, 0);
    g.player.systems.engines.power = 1;

    assert.equal(jumpBlocked(g), null);
    commitJump(g, to);
    assert.equal(g.jumps, 1);
  });
});

describe("manning a damaged system", () => {
  // Systems, the paragraph above "Main systems": "Ionized, damaged, hacked or disabled ... systems cannot be manned".
  it("drops the manning bonus while the system has damage", () => {
    const g = createGame(6);
    assert.equal(manning(g, g.player, "player", "engines"), true);
    g.player.systems.engines.damage = 1;
    assert.equal(manning(g, g.player, "player", "engines"), false);
  });

  it("gives Sensors no manned level while damaged, mind-controlled, or out of air", () => {
    const g = createGame(7);
    const c = g.crew.find((x) => x.side === "player");
    assert.ok(c);
    c.room = "p-sensors";
    assert.equal(sensorLevel(g, g.player, "player"), 3);
    g.player.systems.sensors.damage = 1;
    assert.equal(sensorLevel(g, g.player, "player"), 1);
    g.player.systems.sensors.damage = 0;
    c.leashed = 10;
    assert.equal(sensorLevel(g, g.player, "player"), 2);
    c.leashed = 0;
    const room = g.player.rooms.find((r) => r.id === "p-sensors");
    assert.ok(room);
    room.o2 = 0;
    assert.equal(sensorLevel(g, g.player, "player"), 2);
  });
});

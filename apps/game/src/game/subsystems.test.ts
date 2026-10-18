import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beginBoarding,
  commitJump,
  createGame,
  evasionPercent,
  ftlDriveCharging,
  ftlDriveSeconds,
  ftlQuietSeconds,
  ftlSeconds,
  jumpBlocked,
  manning,
  startCombat,
  step,
} from "./sim.ts";
import { sensorLevel } from "./extras/sensors.ts";
import type { Crew, Game } from "./types.ts";

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

function unmannedEngines(g: Game, level: number) {
  g.player.systems.engines.level = level;
  g.player.systems.engines.power = level;
  g.player.systems.engines.damage = 0;
  g.player.systems.engines.ion = [];
  for (const c of g.crew) {
    if (c.side !== "player" || c.room !== "p-engines") continue;
    c.room = "p-medbay";
    c.path = [];
  }
}

function seconds(g: Game, n: number) {
  const steps = Math.round(n / 0.05);
  for (let i = 0; i < steps; i++) step(g, 0.05);
}

function plantBoarder(g: Game, room: string): Crew {
  g.uid = (g.uid + 1) >>> 0;
  const c: Crew = {
    id: "u" + g.uid.toString(36),
    name: "Human",
    side: "enemy",
    aboard: "player",
    hp: 100,
    maxHp: 100,
    room,
    path: [],
    move: 0,
    think: 9999,
    tone: 3,
    kin: "human",
  };
  g.crew.push(c);
  return c;
}

describe("FTL charge with no enemy hull", () => {
  // Engines, "FTL Drive charge time": 23 seconds, further decreased by the same factors as the in-fight table.
  // INFERRED: 23 is the unmanned level-1 cell (67.9s), scaled by this hull's in-fight time.
  it("scales the 23 second base by the in-fight cell", () => {
    const g = createGame(20);
    unmannedEngines(g, 1);
    assert.equal(ftlQuietSeconds(g), 23);
    unmannedEngines(g, 2);
    assert.ok(Math.abs(ftlQuietSeconds(g)! - (23 * 53.1) / 67.9) < 1e-9);
  });

  it("charges that clock through a hazard, and jumps at once once the hazard is gone", () => {
    const g = createGame(21);
    unmannedEngines(g, 1);
    g.phase = "map";
    g.paused = false;
    g.flee = 0;
    g.flare = true;
    seconds(g, 1);
    const rate = ftlQuietSeconds(g)!;
    assert.equal(rate, 23);
    assert.ok(Math.abs(g.flee - 1 / rate) < 1e-4);
    assert.equal(ftlDriveCharging(g), true);
    const to = jumpTarget(g);
    commitJump(g, to);
    assert.equal(g.jumps, 0);
    g.flare = false;
    assert.equal(ftlDriveSeconds(g), 0);
    assert.equal(ftlDriveCharging(g), false);
    commitJump(g, to);
    assert.equal(g.jumps, 1);
  });

  it("does not treat a nebula or an ion storm as that hazard", () => {
    const g = createGame(22);
    unmannedEngines(g, 1);
    g.flee = 0.25;
    g.player.storm = true;
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here);
    here.kind = "nebula";
    assert.equal(ftlDriveCharging(g), false);
    assert.equal(ftlDriveSeconds(g), 0);
    commitJump(g, jumpTarget(g));
    assert.equal(g.jumps, 1);
  });

  it("finishes a partial charge at once when the map is quiet", () => {
    const g = createGame(23);
    unmannedEngines(g, 1);
    g.flee = 0.25;
    step(g, 0.05);
    assert.equal(g.flee, 1);
  });

  it("keeps the printed table while an enemy hull is on the scope", () => {
    const g = fight(24);
    unmannedEngines(g, 1);
    g.asteroid = true;
    assert.equal(ftlDriveSeconds(g), ftlSeconds(g, g.player));
    assert.equal(ftlDriveSeconds(g), 67.9);
    g.asteroid = false;
    g.flee = 0;
    seconds(g, 1);
    assert.ok(Math.abs(g.flee - 1 / 67.9) < 1e-4);
    const jumps = g.jumps;
    commitJump(g, jumpTarget(g));
    assert.equal(g.jumps, jumps);
  });

  it("uses the 23 second clock for boarders, then jumps at once when they are gone", () => {
    const g = createGame(25);
    unmannedEngines(g, 1);
    const boarder = plantBoarder(g, "p-sensors");
    beginBoarding(g);
    assert.equal(g.enemy, null);
    g.flee = 0;
    seconds(g, 1);
    assert.ok(Math.abs(g.flee - 1 / 23) < 1e-4);
    const mate = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(mate);
    boarder.room = mate.room;
    boarder.hp = 0.2;
    for (let i = 0; i < 80 && g.phase === "combat"; i++) step(g, 0.05);
    assert.equal(g.phase, "map");
    assert.equal(g.flee, 1);
  });

  it("keeps a partial charge when a sun is still up after the boarders die", () => {
    const g = createGame(26);
    unmannedEngines(g, 1);
    const boarder = plantBoarder(g, "p-sensors");
    beginBoarding(g, false, true);
    g.flee = 0.4;
    const mate = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(mate);
    boarder.room = mate.room;
    boarder.hp = 0.2;
    for (let i = 0; i < 80 && g.phase === "combat"; i++) step(g, 0.05);
    assert.equal(g.phase, "map");
    assert.equal(g.flare, true);
    assert.ok(g.flee > 0.4 && g.flee < 1);
    commitJump(g, jumpTarget(g));
    assert.equal(g.jumps, 0);
  });
});

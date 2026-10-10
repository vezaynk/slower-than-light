import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REPAIR_SECONDS,
  applyImpact,
  blastHits,
  closeAllDoors,
  createGame,
  doorLevel,
  evasionPercent,
  lockdown,
  openAllDoors,
  startCombat,
  step,
  toggleDoor,
} from "./sim.ts";
import { armSpike, installSpike, launchSpike, tickSpike, toggleSpikePower } from "./extras/spike.ts";
import type { Game, Shot } from "./types.ts";

function calm(g: Game) {
  g.player.weapons = [];
  if (g.enemy) g.enemy.weapons = [];
  g.enemyEscape = null;
  g.enemySurrender = null;
  g.asb = false;
  g.asteroid = false;
  g.bossSurge = 0;
  g.boardTimer = 0;
  for (const c of g.crew) {
    c.path = [];
    c.stun = 30;
  }
}

function fight(seed = 1): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  calm(g);
  return g;
}

function advance(g: Game, seconds: number) {
  const steps = Math.round(seconds / 0.05);
  for (let i = 0; i < steps; i++) step(g, 0.05);
}

/** step() subtracts 0.05, and 7 is not an exact multiple of that float. Drain until the timer hits 0. */
function finishStuck(g: Game, door: { stuck: number }) {
  let n = 0;
  while (door.stuck > 0 && n < 400) {
    step(g, 0.05);
    n += 1;
  }
  assert.equal(door.stuck, 0);
}

function quietEngines(g: Game, ship: "player" | "enemy") {
  const hull = ship === "player" ? g.player : g.enemy!;
  hull.systems.engines.damage = hull.systems.engines.level;
  hull.systems.engines.power = 0;
  hull.shieldNow = 0;
  hull.zoltan = undefined;
}

function breachShot(from: "player" | "enemy", roomId: string): Shot {
  return {
    id: "breach",
    kind: "laser",
    from,
    damage: 1,
    ion: 0,
    fireChance: 0,
    breachChance: 1,
    targetRoom: roomId,
    wait: 0,
    t: 0,
    duration: 1,
  };
}

describe("broken doors", () => {
  it("lets a player door be closed after 7 seconds, and only auto-closes it when Close All was waiting", () => {
    // Door System: health resets and the door can be controlled again. Close All (X) shuts it then.
    const g = fight(1);
    g.player.systems.doors.level = 2;
    g.player.systems.doors.damage = 0;
    g.player.systems.doors.ion = [];
    const door = g.player.doors.find((d) => d.b !== "void");
    assert.ok(door);
    door.open = true;
    door.hp = 3;
    door.stuck = 7;
    finishStuck(g, door);
    assert.equal(door.open, true);
    assert.equal(door.hp, 0);
    toggleDoor(g, door.a, door.b);
    assert.equal(door.open, false);

    door.open = true;
    door.stuck = 7;
    closeAllDoors(g);
    assert.equal(door.open, true);
    assert.equal(door.seal, true);
    finishStuck(g, door);
    assert.equal(door.open, false);
    assert.equal(door.stuck, 0);
    assert.equal(door.seal, undefined);
    assert.equal(door.hp, 0);
  });

  it("drops a waiting Close All when Open All is issued", () => {
    const g = fight(2);
    g.player.systems.doors.level = 2;
    g.player.systems.doors.damage = 0;
    const door = g.player.doors.find((d) => d.b !== "void");
    assert.ok(door);
    door.open = true;
    door.stuck = 7;
    closeAllDoors(g);
    openAllDoors(g);
    assert.equal(door.seal, undefined);
    finishStuck(g, door);
    assert.equal(door.open, true);
    assert.equal(door.stuck, 0);
  });

  it("leaves a broken enemy door open after 7 seconds", () => {
    // Boarding, "Doors": broken doors on enemy ships stay open.
    const g = fight(3);
    const enemy = g.enemy!;
    enemy.systems.doors.level = 2;
    enemy.systems.doors.damage = 0;
    const door = enemy.doors.find((d) => d.b !== "void");
    assert.ok(door);
    door.open = true;
    door.stuck = 7;
    door.hp = 4;
    finishStuck(g, door);
    assert.equal(door.open, true);
  });

  it("lets a boarder walk through a shut level-1 door and makes them break a blast door", () => {
    // Boarding, "Doors": level 2+ doors must be broken. Level 1 does not stop them, and the door stays shut.
    const g = fight(4);
    g.player.systems.doors.level = 1;
    g.player.systems.doors.damage = 0;
    g.player.systems.doors.ion = [];
    const door = g.player.doors.find((d) => d.b !== "void");
    assert.ok(door);
    door.open = false;
    door.hp = 0;
    door.stuck = 0;
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe);
    foe.aboard = "player";
    foe.room = door.a;
    foe.path = [door.b];
    foe.move = 0;
    foe.stun = 0;
    foe.hp = 100;
    for (let i = 0; i < 200 && foe.room === door.a; i++) step(g, 0.05);
    assert.equal(foe.room, door.b);
    assert.equal(door.open, false);
    assert.equal(door.stuck, 0);

    g.player.systems.doors.level = 2;
    door.open = false;
    door.hp = 0;
    door.stuck = 0;
    foe.room = door.a;
    foe.path = [door.b];
    foe.move = 0;
    step(g, 0.05);
    assert.equal(foe.room, door.a);
    assert.equal(door.open, false);
    assert.ok(Math.abs(door.hp - (blastHits(2) - 0.05)) < 1e-9, String(door.hp));
  });

  it("closes a coated door by hand after Open All", () => {
    // Door System: Z overrides the coating, and those doors can then be closed (X, or one door).
    const g = createGame(11, "crystal-a");
    startCombat(g, "scout");
    calm(g);
    const crystal = g.crew.find((c) => c.kin === "shard" && c.hp > 0);
    assert.ok(crystal);
    const room = g.player.rooms.find((r) => r.id === crystal.room);
    assert.ok(room);
    const door = g.player.doors.find((d) => d.b !== "void" && (d.a === room.id || d.b === room.id));
    assert.ok(door);
    door.open = false;
    assert.equal(lockdown(g, crystal.id), true);
    assert.ok((room.lock ?? 0) > 0);
    toggleDoor(g, door.a, door.b);
    assert.equal(door.open, false);
    openAllDoors(g);
    assert.equal(door.open, true);
    toggleDoor(g, door.a, door.b);
    assert.equal(door.open, false);
    assert.ok((room.lock ?? 0) > 0);
    door.open = true;
    closeAllDoors(g);
    assert.equal(door.open, false);
  });
});

describe("hacked doors", () => {
  function armed(seed: number): Game {
    const g = createGame(seed);
    g.scrap = 80;
    g.player.parts = 2;
    assert.equal(installSpike(g), true);
    toggleSpikePower(g);
    startCombat(g, "scout");
    calm(g);
    return g;
  }

  function land(g: Game, system: string) {
    armSpike(g, system);
    assert.equal(launchSpike(g), true);
    const kit = g.player.kits.spike!;
    kit.hackFly = 0;
    tickSpike(g, 1e-6);
  }

  it("closes a hacked door when the 7 seconds end, and leaves it broken if hacking drops first", () => {
    // Boarding, "Doors": a hacked room's broken door heals and auto-closes. Depowering before that keeps it broken.
    const g = armed(5);
    const enemy = g.enemy!;
    enemy.systems.doors.level = 1;
    land(g, "shields");
    const room = enemy.rooms.find((r) => r.system === "shields");
    assert.ok(room);
    const door = enemy.doors.find((d) => d.b !== "void" && (d.a === room.id || d.b === room.id));
    assert.ok(door);
    door.open = true;
    door.stuck = 0.05;
    door.hp = 0;
    finishStuck(g, door);
    assert.equal(door.open, false);
    assert.equal(door.hacked, true);

    door.open = true;
    door.stuck = 0.2;
    door.hp = 0;
    g.player.kits.spike!.power = 0;
    finishStuck(g, door);
    assert.equal(door.open, true);
    assert.equal(door.hacked, undefined);
  });

  it("spreads fire through a hacked door at the open-door pace", () => {
    // Hacking, "Overview": hacked system doors spread fire at the fastest pace.
    const g = fight(6);
    g.player.systems.doors.level = 2;
    g.player.systems.doors.damage = 0;
    const room = g.player.rooms.find((r) => r.system === "oxygen");
    assert.ok(room);
    const doors = g.player.doors.filter((d) => d.b !== "void" && (d.a === room.id || d.b === room.id));
    assert.ok(doors.length > 0);
    for (const d of doors) {
      d.open = false;
      d.hacked = true;
    }
    room.fire = 1;
    room.o2 = 100;
    room.fireTick = 0;
    step(g, 0.05);
    assert.ok(Math.abs(room.fireTick - 0.05) < 1e-9, String(room.fireTick));

    const slow = fight(7);
    slow.player.systems.doors.level = 2;
    const sealed = slow.player.rooms.find((r) => r.system === "oxygen");
    assert.ok(sealed);
    for (const d of slow.player.doors) d.open = false;
    sealed.fire = 1;
    sealed.o2 = 100;
    sealed.fireTick = 0;
    step(slow, 0.05);
    assert.ok(Math.abs(sealed.fireTick - 0.05 / 10) < 1e-9, String(sealed.fireTick));
  });
});

describe("enemy breaches and doors", () => {
  it("shuts the room's doors when a breach opens or is sealed, and only while the system functions", () => {
    // Door System and Boarding, "Doors": both events close enemy doors if the Door System is functioning.
    const g = fight(8);
    const enemy = g.enemy!;
    quietEngines(g, "enemy");
    assert.equal(evasionPercent(g, enemy, "enemy"), 0);
    enemy.systems.doors.level = 2;
    enemy.systems.doors.damage = 0;
    enemy.systems.doors.ion = [];
    const room = enemy.rooms.find(
      (r) => r.system && enemy.doors.some((d) => d.a === r.id || d.b === r.id),
    );
    assert.ok(room);
    const door = enemy.doors.find((d) => d.a === room.id || d.b === room.id);
    assert.ok(door);
    door.open = true;
    door.stuck = 4;
    door.hp = 2;
    const before = room.breach;
    applyImpact(g, breachShot("player", room.id));
    assert.equal(room.breach, before + 1);
    assert.equal(door.open, false);
    assert.equal(door.stuck, 0);
    assert.equal(door.hp, 0);

    enemy.systems.doors.damage = enemy.systems.doors.level;
    assert.equal(doorLevel(g, enemy, "enemy"), 0);
    door.open = true;
    door.stuck = 4;
    applyImpact(g, breachShot("player", room.id));
    assert.equal(door.open, true);
    assert.equal(door.stuck, 4);

    enemy.systems.doors.damage = 0;
    enemy.systems.doors.level = 1;
    enemy.systems.doors.ion = [];
    assert.ok(doorLevel(g, enemy, "enemy") >= 1);
    door.open = true;
    door.stuck = 0;
    door.hp = 3;
    applyImpact(g, breachShot("player", room.id));
    assert.equal(door.open, false);
    assert.equal(door.stuck, 0);
    assert.equal(door.hp, 3);

    enemy.systems.doors.level = 2;
    enemy.systems.doors.ion = [5, 5];
    assert.equal(doorLevel(g, enemy, "enemy"), 0);
    door.open = true;
    door.stuck = 2;
    applyImpact(g, breachShot("player", room.id));
    assert.equal(door.open, true);
    assert.equal(door.stuck, 2);
  });

  it("does not shut the player's doors when their own room is breached", () => {
    const g = fight(9);
    quietEngines(g, "player");
    assert.equal(evasionPercent(g, g.player, "player"), 0);
    g.player.systems.doors.level = 3;
    const room = g.player.rooms.find((r) => r.system === "oxygen");
    assert.ok(room);
    const door = g.player.doors.find((d) => d.b !== "void" && (d.a === room.id || d.b === room.id));
    assert.ok(door);
    door.open = true;
    door.stuck = 5;
    applyImpact(g, breachShot("enemy", room.id));
    assert.ok(room.breach > 0);
    assert.equal(door.open, true);
    assert.equal(door.stuck, 5);
  });

  it("shuts enemy doors when a breach is sealed", () => {
    const g = createGame(10);
    g.sector = 3;
    g.augments = [];
    startCombat(g, "Slug ship");
    assert.equal(g.enemy?.faction, "slug");
    calm(g);
    const enemy = g.enemy!;
    enemy.systems.doors.level = 2;
    enemy.systems.doors.damage = 0;
    enemy.systems.doors.ion = [];
    const room = enemy.rooms[0];
    assert.ok(room);
    const away = enemy.rooms.find((r) => r.id !== room.id);
    assert.ok(away);
    for (const c of g.crew) {
      if (c.aboard === "enemy" && c.room === room.id) c.room = away.id;
    }
    room.breach = 1;
    room.breachFix = REPAIR_SECONDS - 0.03;
    room.fire = 0;
    const door = enemy.doors.find((d) => d.a === room.id || d.b === room.id);
    assert.ok(door);
    door.open = true;
    door.stuck = 3;
    step(g, 0.05);
    assert.equal(room.breach, 0);
    assert.equal(door.open, false);
    assert.equal(door.stuck, 0);
  });
});

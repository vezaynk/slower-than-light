import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HACK_COAT_HITS, blastHits, createGame, lockdown, startCombat, step } from "../sim.ts";
import { HACKED_DOOR_LEVEL } from "../extras/spike.ts";
import type { Game, Kit, Room } from "../types.ts";

function spike(level: number, power = level): Kit {
  return { id: "spike", level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function calm(g: Game) {
  g.player.weapons = [];
  if (g.enemy) g.enemy.weapons = [];
  g.enemyEscape = null;
  g.enemySurrender = null;
  g.asb = false;
  g.asteroid = false;
  g.bossSurge = 0;
  g.boardTimer = 0;
  g.player.zoltan = undefined;
  if (g.enemy) g.enemy.zoltan = undefined;
}

function interior(g: Game, ship: "player" | "enemy", room: Room) {
  const hull = ship === "player" ? g.player : g.enemy!;
  return hull.doors.filter((door) => door.b !== "void" && (door.a === room.id || door.b === room.id));
}

function advance(g: Game, seconds: number) {
  const target = g.time + seconds;
  let n = 0;
  while (g.time + 1e-4 < target && n < 20000) {
    step(g, 0.05);
    n += 1;
  }
  assert.ok(n < 20000);
}

describe("door hits by difficulty", () => {
  it("uses the printed Hard, Normal, and Easy columns", () => {
    assert.deepEqual(
      [2, 3, 4].map((level) => blastHits(level, "hard")),
      [6, 10, 15],
    );
    assert.deepEqual(
      [2, 3, 4].map((level) => blastHits(level, "normal")),
      [8, 12, 18],
    );
    assert.deepEqual(
      [2, 3, 4].map((level) => blastHits(level, "easy")),
      [12, 16, 20],
    );
    assert.equal(blastHits(1, "easy"), 0);
    assert.equal(blastHits(2), 8);
  });

  it("coats a level-2 door from the run's column", () => {
    for (const [difficulty, hits] of [
      ["easy", 12],
      ["hard", 6],
    ] as const) {
      const g = createGame(4, "crystal-a", difficulty);
      startCombat(g, "scout");
      calm(g);
      g.player.systems.doors.level = 2;
      g.player.systems.doors.damage = 0;
      const room = g.player.rooms.find((r) => r.system === "weapons");
      const crystal = g.crew.find((c) => c.kin === "shard" && c.hp > 0);
      assert.ok(room && crystal);
      crystal.room = room.id;
      crystal.aboard = "player";
      crystal.path = [];
      assert.equal(lockdown(g, crystal.id), true);
      const doors = interior(g, "player", room);
      assert.ok(doors.length > 0);
      assert.equal(doors[0]!.hp, hits);
    }
  });
});

describe("crystal lockdown and a hacking drone", () => {
  it("leaves 4 hits when the coating was up before the drone attached", () => {
    const g = createGame(4, "crystal-a");
    startCombat(g, "scout");
    calm(g);
    assert.ok(g.enemy);
    g.player.systems.doors.level = 2;
    g.player.systems.doors.damage = 0;
    const room = g.player.rooms.find((r) => r.system === "weapons");
    const crystal = g.crew.find((c) => c.kin === "shard" && c.hp > 0);
    assert.ok(room && crystal);
    crystal.room = room.id;
    crystal.aboard = "player";
    crystal.path = [];
    assert.equal(lockdown(g, crystal.id), true);
    const doors = interior(g, "player", room);
    assert.ok(doors.length > 0);
    assert.equal(doors[0]!.hp, blastHits(2));

    const kit = spike(2);
    kit.target = "weapons";
    kit.hackFly = 0.01;
    kit.hackFlyTotal = 0.01;
    g.enemy.kits = { spike: kit };
    g.enemy.parts = 2;
    step(g, 0.05);
    assert.equal(kit.hackLatched, true);
    assert.equal(room.lockHack, true);
    assert.ok((room.lock ?? 0) > 0);
    // Hold the pulse off so the coating can melt first.
    kit.cool = 1000;
    room.lock = 0.01;
    step(g, 0.05);
    assert.equal(room.lock ?? 0, 0);
    assert.equal(room.lockHack, undefined);
    for (const door of doors) {
      assert.equal(door.hp, HACK_COAT_HITS);
      assert.equal(door.hp, 4);
    }

    // Crystal Lockdown: another lockdown resets hacked-door health and the coating protects it.
    crystal.lockCool = 0;
    assert.equal(lockdown(g, crystal.id), true);
    assert.equal(doors[0]!.hp, blastHits(HACKED_DOOR_LEVEL));
    assert.equal(doors[0]!.hp, 12);
    assert.equal(doors[0]!.coat, 60);
    const other = doors[0]!.a === room.id ? doors[0]!.b : doors[0]!.a;
    const human = g.crew.find((c) => c.side === "player" && c.kin !== "shard" && c.hp > 0);
    assert.ok(human);
    for (const c of g.crew) c.path = [];
    human.aboard = "player";
    human.room = room.id;
    human.path = [other];
    human.move = 0;
    human.stun = 0;
    doors[0]!.open = false;
    advance(g, 1);
    assert.equal(doors[0]!.hp, 12);
    assert.ok((doors[0]!.coat ?? 0) < 60);
    room.lock = 0.01;
    step(g, 0.05);
    assert.equal(doors[0]!.hp, 12);
    assert.equal(room.lockHack, undefined);
  });

  it("keeps normal hacked-door health when the pulse starts during the coating", () => {
    const g = createGame(5, "crystal-a");
    startCombat(g, "scout");
    calm(g);
    assert.ok(g.enemy);
    const room = g.player.rooms.find((r) => r.system === "weapons");
    const crystal = g.crew.find((c) => c.kin === "shard" && c.hp > 0);
    assert.ok(room && crystal);
    crystal.room = room.id;
    crystal.path = [];
    lockdown(g, crystal.id);
    const door = interior(g, "player", room)[0];
    assert.ok(door);
    const kit = spike(2);
    kit.target = "weapons";
    kit.hackFly = 0.01;
    kit.hackFlyTotal = 0.01;
    g.enemy.kits = { spike: kit };
    step(g, 0.05);
    assert.equal(kit.hackLatched, true);
    assert.equal(kit.on, false);
    step(g, 0.05);
    assert.equal(kit.on, true);
    assert.equal(room.lockHack, undefined);
    assert.equal(door.hp, blastHits(HACKED_DOOR_LEVEL));
    room.lock = 0.01;
    step(g, 0.05);
    assert.equal(door.hp, 12);
  });

  it("restores level-3 health when the lockdown comes after the drone is attached", () => {
    const g = createGame(6, "crystal-a");
    startCombat(g, "scout");
    calm(g);
    assert.ok(g.enemy);
    g.player.systems.doors.level = 2;
    g.player.systems.doors.damage = 0;
    const room = g.player.rooms.find((r) => r.system === "weapons");
    const crystal = g.crew.find((c) => c.kin === "shard" && c.hp > 0);
    assert.ok(room && crystal);
    crystal.room = room.id;
    crystal.path = [];
    const kit = spike(2);
    kit.target = "weapons";
    kit.hackFly = 0.01;
    kit.hackFlyTotal = 0.01;
    g.enemy.kits = { spike: kit };
    step(g, 0.05);
    assert.equal(kit.hackLatched, true);
    kit.cool = 1000;
    assert.equal(lockdown(g, crystal.id), true);
    const door = interior(g, "player", room)[0];
    assert.ok(door);
    assert.equal(door.hp, 12);
    assert.equal(room.lockHack, undefined);
    room.lock = 0.01;
    step(g, 0.05);
    assert.equal(door.hp, 12);
  });

  it("breaks those 4-hit doors in four seconds", () => {
    const g = createGame(7, "crystal-a");
    startCombat(g, "scout");
    calm(g);
    assert.ok(g.enemy);
    const room = g.player.rooms.find((r) => r.system === "weapons");
    const crystal = g.crew.find((c) => c.kin === "shard" && c.hp > 0);
    const human = g.crew.find((c) => c.side === "player" && c.kin !== "shard" && c.hp > 0);
    assert.ok(room && crystal && human);
    crystal.room = room.id;
    crystal.path = [];
    lockdown(g, crystal.id);
    const door = interior(g, "player", room)[0];
    assert.ok(door);
    const other = door.a === room.id ? door.b : door.a;
    const kit = spike(2);
    kit.target = "weapons";
    kit.hackFly = 0.01;
    kit.hackFlyTotal = 0.01;
    g.enemy.kits = { spike: kit };
    step(g, 0.05);
    kit.cool = 1000;
    room.lock = 0.01;
    step(g, 0.05);
    assert.equal(door.hp, 4);
    door.open = false;
    door.stuck = 0;
    for (const c of g.crew) c.path = [];
    human.aboard = "player";
    human.room = other;
    human.path = [room.id];
    human.move = 0;
    human.stun = 0;
    advance(g, 3.5);
    assert.equal(door.open, false);
    assert.ok(door.hp > 0);
    advance(g, 1);
    assert.equal(door.open, true);
    // The break sets 7 seconds, then the rest of that second ticks it down.
    assert.ok(door.stuck > 6 && door.stuck <= 7, String(door.stuck));
  });

  it("uses the same 4 hits when the player's drone latches onto a coated enemy room", () => {
    const g = createGame(8, "crystal-a");
    startCombat(g, "scout");
    calm(g);
    assert.ok(g.enemy);
    g.enemy.systems.doors.level = 4;
    g.enemy.systems.doors.damage = 0;
    g.enemy.drones = [];
    const room = g.enemy.rooms.find((r) => r.system === "weapons");
    const crystal = g.crew.find((c) => c.kin === "shard" && c.hp > 0);
    assert.ok(room && crystal);
    for (const c of g.crew) if (c.aboard === "enemy" && c.room === room.id) c.room = g.enemy.rooms[0]!.id;
    crystal.aboard = "enemy";
    crystal.room = room.id;
    crystal.path = [];
    assert.equal(lockdown(g, crystal.id), true);
    const door = interior(g, "enemy", room)[0];
    assert.ok(door);
    assert.equal(door.hp, blastHits(4));
    g.player.kits.spike = spike(1);
    g.player.kits.spike.hackFly = 0.01;
    g.player.kits.spike.hackFlyTotal = 0.01;
    g.enemy.hackFlying = "weapons";
    // Their pulse on our Hacking stops our pulse from starting as the drone latches.
    g.enemy.kits = {
      spike: { ...spike(2), target: "spike", on: true, left: 8, hackLatched: true },
    };
    step(g, 0.05);
    assert.equal(g.enemy.hackDrone, "weapons");
    assert.equal(g.player.kits.spike.on, false);
    assert.equal(room.lockHack, true);
    room.lock = 0.01;
    step(g, 0.05);
    assert.equal(door.hp, 4);

    const kept = createGame(9, "crystal-a");
    startCombat(kept, "scout");
    calm(kept);
    assert.ok(kept.enemy);
    kept.enemy.drones = [];
    const foeRoom = kept.enemy.rooms.find((r) => r.system === "weapons");
    const gem = kept.crew.find((c) => c.kin === "shard" && c.hp > 0);
    assert.ok(foeRoom && gem);
    gem.aboard = "enemy";
    gem.room = foeRoom.id;
    gem.path = [];
    lockdown(kept, gem.id);
    const foeDoor = interior(kept, "enemy", foeRoom)[0];
    assert.ok(foeDoor);
    kept.player.kits.spike = spike(1);
    kept.player.kits.spike.hackFly = 0.01;
    kept.player.kits.spike.hackFlyTotal = 0.01;
    kept.enemy.hackFlying = "weapons";
    kept.enemy.kits = { spike: spike(1) };
    step(kept, 0.05);
    assert.equal(kept.player.kits.spike.on, true);
    assert.equal(foeRoom.lockHack, undefined);
    assert.equal(foeDoor.hp, 12);
    foeRoom.lock = 0.01;
    step(kept, 0.05);
    assert.equal(foeDoor.hp, 12);
  });
});

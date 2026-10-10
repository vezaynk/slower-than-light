import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIRE_FIGHT_SHARE,
  adjacentFires,
  createGame,
  fireStarveSeconds,
  openAllDoors,
  shipTicking,
  startCombat,
  step,
} from "./sim.ts";
import type { Game, Room } from "./types.ts";

/** Empty the fire room, shut every door, and keep the door console unmanned so spread uses the level-1 slow. */
function sealed(g: Game, roomId: string): Room {
  assert.equal(g.phase, "map");
  assert.equal(g.enemy, null);
  const room = g.player.rooms.find((r) => r.id === roomId);
  assert.ok(room);
  const away = g.player.rooms.find((r) => r.id !== roomId && r.system !== "doors");
  assert.ok(away);
  for (const c of g.crew) {
    c.room = away.id;
    c.path = [];
    c.stun = 0;
    c.hp = c.maxHp;
  }
  for (const d of g.player.doors) d.open = false;
  assert.ok(g.player.doors.some((d) => d.b !== "void" && (d.a === roomId || d.b === roomId)));
  room.fire = 1;
  room.o2 = 100;
  room.fireTick = 0;
  room.breach = 0;
  return room;
}

function fireTotal(g: Game): number {
  return g.player.rooms.reduce((sum, r) => sum + r.fire, 0);
}

describe("Fires outside a fight", () => {
  it("grows a sealed fire by 0.5 once the level-1 door slow passes 7s", () => {
    const g = createGame(1);
    const room = sealed(g, "p-oxygen");
    const quiet = new Map(g.player.rooms.filter((r) => r.id !== room.id).map((r) => [r.id, r.o2]));
    // Door System: a level-1 closed door slows spread ×1.75. The tick must pass 7s of slowed time.
    const slow = 1.75;
    const dt = 0.05;
    let steps = 0;
    while (room.fire === 1 && steps < 400) {
      step(g, dt);
      steps += 1;
    }
    const elapsed = steps * dt;
    assert.equal(room.fire, 1.5);
    assert.equal(room.fireTick, 0);
    assert.ok(elapsed + 1e-6 >= 7 * slow, `${elapsed}`);
    assert.ok(elapsed - 7 * slow <= dt + 1e-6, `${elapsed}`);
    assert.ok(g.player.rooms.every((r) => r.id === room.id || r.fire === 0));
    // Level 1 refills at 1.2%/s and one fire consumes 0.96%/s, so a full room stays full.
    assert.equal(room.o2, 100);
    for (const [id, o2] of quiet) assert.equal(g.player.rooms.find((r) => r.id === id)!.o2, o2, id);
  });

  it("grows a sealed fire by 0.5 once blast doors pass 7s", () => {
    const g = createGame(2);
    g.player.systems.doors.level = 2;
    const room = sealed(g, "p-oxygen");
    const dt = 0.05;
    let steps = 0;
    while (room.fire === 1 && steps < 2000) {
      step(g, dt);
      steps += 1;
    }
    const elapsed = steps * dt;
    assert.equal(room.fire, 1.5);
    assert.ok(elapsed + 1e-6 >= 7 * 10, `${elapsed}`);
    assert.ok(elapsed - 70 <= dt + 1e-6, `${elapsed}`);
  });

  it("a crew member in the room puts the fire out and takes 2.128 HP per second", () => {
    const g = createGame(3);
    const room = g.player.rooms.find((r) => r.id === "p-oxygen")!;
    const worker = g.crew[0]!;
    for (const c of g.crew) {
      c.path = [];
      c.stun = 0;
      c.kin = "plain";
      c.skills = {};
      if (c.id !== worker.id) c.room = "p-pilot";
    }
    worker.room = room.id;
    worker.hp = 100;
    worker.maxHp = 100;
    room.fire = 1;
    room.o2 = 100;
    room.fireTick = 0;
    step(g, 0.05);
    const left = 1 - FIRE_FIGHT_SHARE * 0.05;
    assert.ok(Math.abs(room.fire - left) < 1e-9, `${room.fire}`);
    assert.ok(Math.abs(worker.hp - (100 - 2.128 * left * 0.05)) < 1e-6, `${worker.hp}`);
  });

  it("starts a die-out timer below 10% when oxygen is off", () => {
    const g = createGame(4);
    g.player.systems.oxygen.power = 0;
    const room = sealed(g, "p-oxygen");
    room.o2 = 10;
    room.fire = 1;
    const quiet = g.player.rooms.find((r) => r.id === "p-sensors")!;
    quiet.o2 = 80;
    quiet.fire = 0;
    // Fires, "Dealing with fires": below 10% the fire waits out a 5–14s timer. No adjacent fires is 2.08–5.83s.
    // Unpowered rooms also lose 1.2%/s, and the fire still consumes 0.96%/s.
    assert.equal(adjacentFires(g.player, room), 0);
    step(g, 0.05);
    assert.equal(room.fire, 1);
    assert.ok(Math.abs(room.o2 - (10 - (1.2 + 0.96) * 0.05)) < 1e-9, `${room.o2}`);
    assert.ok(Math.abs(quiet.o2 - (80 - 1.2 * 0.05)) < 1e-9, `${quiet.o2}`);
    const dt = 0.05;
    let steps = 1;
    while (room.fire > 0 && steps < 200) {
      step(g, dt);
      steps += 1;
    }
    const elapsed = steps * dt;
    assert.equal(room.fire, 0);
    assert.ok(elapsed + 1e-6 >= 5 / 2.4, `${elapsed}`);
    assert.ok(elapsed - 14 / 2.4 <= dt + 1e-6, `${elapsed}`);
  });

  it("uses the printed die-out formula, and four adjacent fires hold past 10s", () => {
    // Endpoints the page prints: 2.08, 5.83, and 29.17.
    assert.ok(Math.abs(fireStarveSeconds(5, 0) - 5 / 2.4) < 1e-9);
    assert.ok(Math.abs(fireStarveSeconds(14, 0) - 14 / 2.4) < 1e-9);
    assert.ok(Math.abs(fireStarveSeconds(14, 4) - 14 / 0.48) < 1e-9);
    // INFERRED: more than 4 adjacent fires stays on the printed maximum.
    assert.equal(fireStarveSeconds(14, 9), fireStarveSeconds(14, 4));

    const g = createGame(8);
    g.player.systems.oxygen.power = 0;
    const room = sealed(g, "p-oxygen");
    room.o2 = 9;
    room.fire = 1;
    const neighborId = g.player.doors.find((d) => d.b !== "void" && (d.a === room.id || d.b === room.id));
    assert.ok(neighborId);
    const neighbor = g.player.rooms.find((r) => r.id === (neighborId.a === room.id ? neighborId.b : neighborId.a));
    assert.ok(neighbor);
    neighbor.fire = 4;
    neighbor.o2 = 100;
    const clear = g.player.rooms.find((r) => r.id !== room.id && r.id !== neighbor.id);
    assert.ok(clear);
    for (const c of g.crew) c.room = clear.id;
    assert.ok(adjacentFires(g.player, room) >= 4);
    const dt = 0.05;
    let steps = 0;
    while (room.fire > 0 && steps < 800) {
      step(g, dt);
      // Keep the neighbor lit. Its own oxygen drain is not the timer under test.
      neighbor.fire = 4;
      neighbor.o2 = 100;
      steps += 1;
    }
    const elapsed = steps * dt;
    assert.equal(room.fire, 0);
    assert.ok(elapsed + 1e-6 >= 5 / 0.48, `${elapsed}`);
    assert.ok(elapsed - 14 / 0.48 <= dt + 1e-6, `${elapsed}`);
  });

  it("drops the die-out timer when oxygen is back at 10% or more", () => {
    const g = createGame(9);
    const room = sealed(g, "p-oxygen");
    room.o2 = 9;
    room.fire = 1;
    step(g, 1);
    assert.equal(room.fire, 1);
    room.o2 = 100;
    for (let i = 0; i < 600; i++) step(g, 0.05);
    assert.ok(room.fire > 0);
  });

  it("does not repair, heal, or suffocate on the map", () => {
    const g = createGame(5);
    sealed(g, "p-oxygen");
    const med = g.player.rooms.find((r) => r.id === "p-medbay")!;
    g.player.systems.medbay.power = 1;
    g.player.systems.medbay.damage = 1;
    g.player.systems.medbay.fix = 0;
    med.o2 = 4;
    const crew = g.crew[0]!;
    crew.room = med.id;
    crew.hp = 40;
    for (let i = 0; i < 20; i++) step(g, 0.05);
    assert.equal(g.player.systems.medbay.fix, 0);
    assert.equal(g.player.systems.medbay.damage, 1);
    assert.equal(crew.hp, 40);
    // Doors are shut, so the level-1 refill is the only change: 1.2% over this one second.
    assert.ok(Math.abs(med.o2 - (4 + 1.2)) < 1e-6, `${med.o2}`);
  });

  it("can spread through an open door", () => {
    const g = createGame(6);
    const room = sealed(g, "p-oxygen");
    for (const d of g.player.doors) {
      if (d.b !== "void" && (d.a === room.id || d.b === room.id)) d.open = true;
    }
    room.fireTick = 7;
    const before = fireTotal(g);
    step(g, 0.05);
    const after = fireTotal(g);
    assert.equal(room.fireTick, 0);
    assert.ok(after === before + 0.5 || after === before + 1, `${before} -> ${after}`);
  });

  it("stays still while paused or on the title", () => {
    const g = createGame(7);
    const room = sealed(g, "p-oxygen");
    room.fireTick = 7;
    g.paused = true;
    step(g, 0.05);
    assert.equal(room.fire, 1);
    assert.equal(room.o2, 100);
    g.paused = false;
    g.phase = "title";
    step(g, 0.05);
    assert.equal(room.fire, 1);
    assert.equal(room.fireTick, 7);
    assert.equal(room.o2, 100);
  });
});

describe("Oxygen outside a fight", () => {
  it("drains the ship when every door is open, and keeps the clock running", () => {
    const g = createGame(21, "kestrel-a");
    assert.equal(g.phase, "map");
    assert.equal(shipTicking(g), true);
    g.paused = true;
    assert.equal(shipTicking(g), false);
    g.paused = false;
    openAllDoors(g);
    const voids = g.player.doors.filter((d) => d.b === "void");
    assert.ok(voids.length > 0);
    for (let i = 0; i < 60; i++) step(g, 0.05);
    for (const door of voids) {
      const room = g.player.rooms.find((r) => r.id === door.a);
      assert.equal(room?.o2, 0, door.a);
    }
    const avg = g.player.rooms.reduce((n, r) => n + r.o2, 0) / g.player.rooms.length;
    assert.ok(avg < 100, `${avg}`);
  });
});

/** Combat tick, doors shut, oxygen full. */
function ventFight(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  for (const w of [...g.player.weapons, ...(g.enemy?.weapons ?? [])]) w.enabled = false;
  const swarm = g.enemy?.kits.swarm;
  if (swarm) swarm.loadout = [];
  for (const d of g.player.doors) d.open = false;
  for (const r of g.player.rooms) {
    r.o2 = 100;
    r.fire = 0;
    r.breach = 0;
  }
  return g;
}

function airlock(g: Game, roomId: string) {
  const door = g.player.doors.find((d) => d.b === "void" && d.a === roomId);
  assert.ok(door);
  door.open = true;
  return door;
}

function between(g: Game, a: string, b: string) {
  const door = g.player.doors.find(
    (d) => (d.a === a && d.b === b) || (d.a === b && d.b === a),
  );
  assert.ok(door);
  door.open = true;
  return door;
}

describe("Oxygen airlock", () => {
  it("empties the room the airlock is opened in on that tick", () => {
    const g = ventFight(11);
    const room = g.player.rooms.find((r) => r.id === "p-oxygen")!;
    const neighbor = g.player.rooms.find((r) => r.id === "p-medbay")!;
    airlock(g, room.id);
    step(g, 0.05);
    assert.equal(room.o2, 0);
    assert.equal(neighbor.o2, 100);
  });

  it("does not empty a connected room on that same tick", () => {
    const g = ventFight(12);
    const room = g.player.rooms.find((r) => r.id === "p-doors")!;
    const next = g.player.rooms.find((r) => r.id === "p-sensors")!;
    airlock(g, room.id);
    between(g, room.id, next.id);
    step(g, 0.05);
    assert.equal(room.o2, 0);
    assert.equal(next.o2, 100);
    step(g, 0.05);
    // INFERRED: the drop is the existing open-door share, 40% of the difference. The page prints no percent.
    assert.ok(Math.abs(next.o2 - 98.06) < 1e-6, `${next.o2}`);
  });

  it("drains a farther room sooner when a second airlock is open", () => {
    const far = (extra: boolean) => {
      const g = ventFight(13);
      airlock(g, "p-doors");
      if (extra) airlock(g, "p-sensors");
      between(g, "p-doors", "p-sensors");
      between(g, "p-sensors", "p-weapons");
      step(g, 0.05);
      step(g, 0.05);
      return g.player.rooms.find((r) => r.id === "p-weapons")!.o2;
    };
    const one = far(false);
    const two = far(true);
    assert.equal(one, 100);
    assert.ok(two < one, `${two}`);
  });

  it("does not push an airlock room's oxygen into a lower neighbor", () => {
    const g = ventFight(14);
    const room = g.player.rooms.find((r) => r.id === "p-doors")!;
    const next = g.player.rooms.find((r) => r.id === "p-sensors")!;
    room.o2 = 80;
    next.o2 = 20;
    airlock(g, room.id);
    between(g, room.id, next.id);
    step(g, 0.05);
    assert.equal(room.o2, 0);
    // The neighbor only receives its own refill. The airlock's oxygen goes to space.
    assert.ok(next.o2 < 21, `${next.o2}`);
    assert.ok(next.o2 > 20, `${next.o2}`);
  });
});

function powerOxygen(g: Game, bars: number) {
  const sys = g.player.systems.oxygen;
  sys.level = bars;
  sys.power = bars;
  sys.damage = 0;
  sys.ion = [];
}

function holdCrew(g: Game, roomId: string) {
  for (const c of g.crew) {
    if (c.aboard !== "player") continue;
    c.room = roomId;
    c.path = [];
  }
}

function seconds(g: Game, n: number) {
  for (let i = 0; i < Math.round(n / 0.05); i++) step(g, 0.05);
}

describe("Oxygen versus one breach", () => {
  it("Oxygen-3 refills a shut breached room, and Oxygen-2 does not", () => {
    const run = (bars: number) => {
      const g = ventFight(15);
      powerOxygen(g, bars);
      holdCrew(g, "p-pilot");
      const room = g.player.rooms.find((r) => r.id === "p-doors")!;
      room.o2 = 50;
      room.breach = 1;
      seconds(g, 1);
      return room.o2;
    };
    const ox3 = run(3);
    const ox2 = run(2);
    // 8.4 − 7.2 = +1.2%/s. 4.8 − 7.2 = −2.4%/s.
    assert.ok(ox3 > 50, `${ox3}`);
    assert.ok(ox2 < 50, `${ox2}`);
  });

  it("an open door to a full room slows the Oxygen-2 drop", () => {
    const run = (open: boolean) => {
      const g = ventFight(16);
      powerOxygen(g, 2);
      holdCrew(g, "p-pilot");
      const room = g.player.rooms.find((r) => r.id === "p-doors")!;
      const next = g.player.rooms.find((r) => r.id === "p-sensors")!;
      room.o2 = 80;
      next.o2 = 80;
      room.breach = 1;
      if (open) between(g, room.id, next.id);
      seconds(g, 2);
      return room.o2;
    };
    const shut = run(false);
    const fed = run(true);
    assert.ok(fed > shut, `${fed} vs ${shut}`);
  });
});

describe("Boarders leave airless rooms", () => {
  it("walks a boarder from 5% or less toward a room at 10% or more, and a Lanius stays", () => {
    const g = ventFight(17);
    const thin = g.player.rooms.find((r) => r.id === "p-weapons")!;
    thin.o2 = 0;
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe);
    foe.aboard = "player";
    foe.room = thin.id;
    foe.path = [];
    foe.think = 30;
    foe.kin = "plain";
    step(g, 0.05);
    const dest = foe.path[foe.path.length - 1];
    const there = g.player.rooms.find((r) => r.id === dest);
    assert.ok(there && there.o2 >= 10, `${dest} ${there?.o2}`);
    foe.kin = "voidlung";
    foe.path = [];
    foe.room = thin.id;
    thin.o2 = 0;
    step(g, 0.05);
    assert.deepEqual(foe.path, []);
  });

  it("walks mind-controlled crew out of a deprived room", () => {
    const g = ventFight(18);
    const ship = g.enemy;
    assert.ok(ship);
    const door = ship.doors.find((d) => d.b !== "void");
    assert.ok(door);
    for (const d of ship.doors) d.open = false;
    const thin = ship.rooms.find((r) => r.id === door.a)!;
    for (const r of ship.rooms) r.o2 = r.id === thin.id ? 0 : 100;
    const foe = g.crew.find((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0);
    assert.ok(foe);
    foe.room = thin.id;
    foe.path = [];
    foe.kin = "plain";
    foe.leashed = 14;
    g.player.kits.leash = {
      id: "leash",
      level: 1,
      power: 1,
      left: 14,
      cool: 0,
      on: true,
      target: foe.id,
      aux: 0,
    };
    step(g, 0.05);
    const dest = foe.path[foe.path.length - 1];
    const there = ship.rooms.find((r) => r.id === dest);
    assert.ok(there && there.o2 >= 10, `${dest} ${there?.o2}`);
  });
});

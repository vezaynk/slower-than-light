import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blastHits, createGame, startCombat, step } from "../sim.ts";
import { WEAPONS } from "../content.ts";
import type { Game } from "../types.ts";
import {
  armSpike,
  hackLocksDoor,
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

  it("makes a hacked enemy room's doors level-3 blast doors for that ship's crew only", () => {
    // Boarding, "Doors": level 3 regardless of the door system, blocking the ship's crew.
    // Boarders and mind-controlled crew pass. Door system level 1 would otherwise open on the first hit.
    const g = armed(2);
    const enemy = g.enemy!;
    g.player.weapons = [];
    enemy.weapons = [];
    enemy.drones = [];
    enemy.automated = true;
    enemy.systems.doors.level = 1;
    enemy.systems.doors.damage = 0;
    enemy.systems.doors.ion = [];
    g.enemyEscape = null;
    g.enemySurrender = null;
    g.boardTimer = 0;
    armSpike(g, "shields");
    assert.equal(launchLanded(g), true);
    const room = enemy.rooms.find((r) => r.system === "shields");
    assert.ok(room);
    const door = enemy.doors.find((d) => d.b !== "void" && (d.a === room.id || d.b === room.id));
    assert.ok(door);
    assert.equal(door.open, false);
    assert.equal(door.hacked, true);
    assert.equal(hackLocksDoor(g, enemy, door), true);
    const other = enemy.doors.find((d) => d.b !== "void" && d.a !== room.id && d.b !== room.id);
    if (other) assert.equal(other.hacked, undefined);

    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0)!;
    const parked = enemy.rooms.find((r) => r.id !== door.a && r.id !== door.b);
    for (const c of g.crew) {
      if (c.side !== "enemy" || c === foe) continue;
      c.path = [];
      c.stun = 100;
      if (parked) c.room = parked.id;
    }
    foe.aboard = "enemy";
    foe.room = door.a;
    foe.path = [door.b];
    foe.move = 0;
    foe.stun = 0;
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.equal(foe.room, door.a, "own crew still breaking the level-3 door");
    assert.ok(Math.abs(door.hp - (blastHits(3) - 2)) < 1e-9, String(door.hp));

    const board = armed(3);
    const foeHull = board.enemy!;
    board.player.weapons = [];
    foeHull.weapons = [];
    foeHull.drones = [];
    foeHull.automated = true;
    foeHull.systems.doors.level = 1;
    foeHull.systems.doors.damage = 0;
    foeHull.systems.doors.ion = [];
    board.enemyEscape = null;
    board.enemySurrender = null;
    board.boardTimer = 0;
    armSpike(board, "shields");
    assert.equal(launchLanded(board), true);
    const bay = foeHull.rooms.find((r) => r.system === "shields")!;
    const gate = foeHull.doors.find((d) => d.b !== "void" && (d.a === bay.id || d.b === bay.id))!;
    const walker = board.crew.find((c) => c.side === "player" && c.hp > 0)!;
    const bench = foeHull.rooms.find((r) => r.id !== gate.a && r.id !== gate.b);
    for (const c of board.crew) {
      if (c.side !== "enemy") continue;
      c.path = [];
      c.stun = 100;
      if (bench) c.room = bench.id;
    }
    walker.aboard = "enemy";
    walker.room = gate.a;
    walker.path = [gate.b];
    walker.move = 0;
    walker.stun = 0;
    for (let i = 0; i < 20; i++) step(board, 0.05);
    assert.notEqual(walker.room, gate.a, "boarder passed the hacked door");

    const held = armed(4);
    const hull = held.enemy!;
    held.player.weapons = [];
    hull.weapons = [];
    hull.drones = [];
    hull.automated = true;
    hull.systems.doors.level = 1;
    hull.systems.doors.damage = 0;
    hull.systems.doors.ion = [];
    held.enemyEscape = null;
    held.enemySurrender = null;
    held.boardTimer = 0;
    armSpike(held, "shields");
    assert.equal(launchLanded(held), true);
    const sys = hull.rooms.find((r) => r.system === "shields")!;
    const shut = hull.doors.find((d) => d.b !== "void" && (d.a === sys.id || d.b === sys.id))!;
    const turned = held.crew.find((c) => c.side === "enemy" && c.hp > 0)!;
    const aside = hull.rooms.find((r) => r.id !== shut.a && r.id !== shut.b);
    for (const c of held.crew) {
      if (c.side !== "enemy" || c === turned) continue;
      c.path = [];
      c.stun = 100;
      if (aside) c.room = aside.id;
    }
    turned.aboard = "enemy";
    turned.room = shut.a;
    turned.path = [shut.b];
    turned.move = 0;
    turned.stun = 0;
    turned.leashed = 10;
    for (let i = 0; i < 20; i++) step(held, 0.05);
    assert.notEqual(turned.room, shut.a, "mind-controlled crew passed the hacked door");
    assert.ok((turned.leashed ?? 0) > 0);
  });

  it("opens a hacked room to that ship's crew when hacking is depowered, and shuts it when powered again", () => {
    // Boarding, "Hacking": "A hacked room's doors can be manipulated - opened and closed for enemy movement -
    // by de-powering and powering again the Hacking system when necessary."
    const g = armed(2);
    const enemy = g.enemy!;
    g.player.weapons = [];
    enemy.weapons = [];
    enemy.drones = [];
    enemy.automated = true;
    enemy.systems.doors.level = 1;
    enemy.systems.doors.damage = 0;
    enemy.systems.doors.ion = [];
    g.enemyEscape = null;
    g.enemySurrender = null;
    g.boardTimer = 0;
    armSpike(g, "shields");
    assert.equal(launchLanded(g), true);
    const room = enemy.rooms.find((r) => r.system === "shields")!;
    const door = enemy.doors.find((d) => d.b !== "void" && (d.a === room.id || d.b === room.id))!;
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0)!;
    const parked = enemy.rooms.find((r) => r.id !== door.a && r.id !== door.b);
    for (const c of g.crew) {
      if (c.side !== "enemy" || c === foe) continue;
      c.path = [];
      c.stun = 100;
      if (parked) c.room = parked.id;
    }
    const kit = g.player.kits.spike!;
    assert.equal(door.hacked, true);
    kit.power = 0;
    step(g, 0.05);
    assert.equal(door.hacked, undefined);
    foe.aboard = "enemy";
    foe.room = door.a;
    foe.path = [door.b];
    foe.move = 0;
    foe.stun = 0;
    for (let i = 0; i < 20; i++) step(g, 0.05);
    assert.notEqual(foe.room, door.a, "depowered hack lets the ship's crew through");

    kit.power = 1;
    step(g, 0.05);
    assert.equal(door.hacked, true);
    assert.equal(door.open, false);
    foe.room = door.a;
    foe.path = [door.b];
    foe.move = 0;
    foe.stun = 0;
    for (let i = 0; i < 20; i++) step(g, 0.05);
    assert.equal(foe.room, door.a, "powering the hack shuts the door on that crew");
  });

  it("stuns crew and drones in the hacked room for the rest of the pulse", () => {
    // Augmentations, "Offensive Augmentations", Hacking Stun. Boarding, "Stun effect": the rest of the pulse.
    const bare = armed(2);
    const bareRoom = bare.enemy!.rooms.find((r) => r.system === "shields");
    assert.ok(bareRoom);
    const bareFoe = bare.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(bareFoe);
    bareFoe.room = bareRoom.id;
    bareFoe.aboard = "enemy";
    bareFoe.stun = 0;
    armSpike(bare, "shields");
    assert.equal(launchLanded(bare), true);
    tickSpike(bare, 1e-6);
    assert.equal(bareFoe.stun ?? 0, 0);

    const g = armed(2);
    g.augments = ["stun"];
    const enemy = g.enemy!;
    const room = enemy.rooms.find((r) => r.system === "shields");
    const other = enemy.rooms.find((r) => r.id !== room?.id);
    assert.ok(room && other);
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    const boarder = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(foe && boarder);
    foe.room = room.id;
    foe.aboard = "enemy";
    foe.stun = 0;
    boarder.room = room.id;
    boarder.aboard = "enemy";
    boarder.side = "player";
    boarder.stun = 0;
    const walker = {
      id: "walk-in",
      name: "Walker",
      side: "enemy" as const,
      aboard: "enemy" as const,
      hp: 50,
      maxHp: 50,
      room: other.id,
      path: [],
      move: 0,
      think: 0,
      tone: 0,
      stun: 0,
    };
    const parked = {
      id: "stays-out",
      name: "Stay",
      side: "enemy" as const,
      aboard: "enemy" as const,
      hp: 50,
      maxHp: 50,
      room: other.id,
      path: [],
      move: 0,
      think: 0,
      tone: 1,
      stun: 0,
    };
    g.crew.push(walker, parked);
    g.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "ionintruder",
      on: true,
      aux: 0,
      hp: 125,
      room: room.id,
      stun: 0,
    };
    const patch = {
      id: "patch-1",
      kind: "patch",
      alive: true,
      powered: true,
      hp: 25,
      room: room.id,
      aux: 0,
      cool: 0,
      stun: 0,
    };
    const farDrone = {
      id: "patch-far",
      kind: "patch",
      alive: true,
      powered: true,
      hp: 25,
      room: other.id,
      aux: 0,
      cool: 0,
      stun: 0,
    };
    const orbiter = {
      id: "striker-1",
      kind: "striker",
      alive: true,
      powered: true,
      hp: 25,
      room: room.id,
      aux: 0,
      cool: 0,
      stun: 0,
    };
    enemy.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "patch",
      on: true,
      aux: 0,
      drones: [patch, farDrone, orbiter],
    };
    armSpike(g, "shields");
    assert.equal(launchLanded(g), true);
    tickSpike(g, 1e-6);
    const kit = g.player.kits.spike!;
    assert.equal(foe.stun, 4);
    assert.equal(boarder.stun, 4);
    assert.equal(g.player.kits.swarm.stun, 4);
    assert.equal(patch.stun, 4);
    assert.ok(Math.abs(kit.left - 4) < 1e-5);
    assert.equal(walker.stun, 0);
    assert.equal(parked.stun, 0);
    assert.equal(farDrone.stun, 0);
    assert.equal(orbiter.stun, 0);
    walker.room = room.id;
    const left = kit.left;
    tickSpike(g, 1e-6);
    assert.equal(walker.stun, left);
    assert.equal(walker.stun, kit.left + 1e-6);
    assert.equal(parked.stun, 0);
    assert.equal(farDrone.stun, 0);
    assert.equal(orbiter.stun, 0);
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

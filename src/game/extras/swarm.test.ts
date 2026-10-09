import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { onPlayerJump } from "./index.ts";
import { applyImpact, COATED_DOOR_HITS, createGame, REPAIR_SECONDS, startCombat } from "../sim.ts";
import { COMBAT1_SPEED, COMBAT2, orbitLegSeconds } from "../wiki/cited-combat2.ts";
import type { DroneUnit, Game, Kit, Ship, Shot } from "../types.ts";
import {
  BEAM1_SPEED,
  DRONE_COOLDOWN_S,
  DRONE_DOOR_HITS_PER_S,
  DRONE_POWER,
  HULL_POINT_S,
  INSTALL_SCRAP,
  INTRUDER_HP,
  INTRUDER_SPACE_SPEED,
  PATCH_HEAL,
  REDEPLOY_S,
  activateDroneSlot,
  deploy,
  depowerDrone,
  hurtRoomDrones,
  installSwarm,
  installSwarmBundle,
  swarmCombatShots,
  swarmIntercept,
  tickSwarm,
} from "./swarm.ts";

/** A 90 degree orbit leg. Shields, Overview: that leg at Speed 15 is the 2 second layer restore. */
function pinLeg(body: { heading?: number; bearing?: number; left?: number; aux: number }, speed: number) {
  body.heading = 0;
  body.bearing = 90;
  body.left = orbitLegSeconds(0, 90, speed);
  body.aux = 0;
}

/** Fewest interior doors to another system that still has a bar. Mirrors swarm.ts nearestWorkingSystem. */
function nearestSystem(ship: Ship, from: string): string[] {
  const linked = (id: string) => {
    const out: string[] = [];
    for (const door of ship.doors) {
      if (door.b === "void") continue;
      if (door.a === id) out.push(door.b);
      else if (door.b === id) out.push(door.a);
    }
    return out;
  };
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of linked(cur)) {
      if (dist.has(next)) continue;
      dist.set(next, (dist.get(cur) ?? 0) + 1);
      queue.push(next);
    }
  }
  let best = Infinity;
  const tied: string[] = [];
  for (const room of ship.rooms) {
    if (room.id === from || !room.system) continue;
    const sys = ship.systems[room.system];
    if (!sys || sys.damage >= sys.level) continue;
    const steps = dist.get(room.id);
    if (steps == null) continue;
    if (steps < best) {
      best = steps;
      tied.length = 0;
      tied.push(room.id);
    } else if (steps === best) tied.push(room.id);
  }
  return tied;
}

function place(g: Game, power = 3): Kit {
  const kit: Kit = {
    id: "swarm",
    level: 3,
    power,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
  g.player.kits.swarm = kit;
  g.player.parts = 2;
  return kit;
}

describe("swarm", () => {
  it("refuses install when the page has no single store price", () => {
    const g = createGame(1);
    g.scrap = 999;
    assert.equal(INSTALL_SCRAP, null);
    assert.equal(installSwarm(g), false);
    assert.equal(g.player.kits.swarm, undefined);
    assert.equal(g.scrap, 999);
  });

  it("sells the repair bundle for 75 and any other schematic for 85", () => {
    const g = createGame(4);
    g.scrap = 80;
    assert.equal(installSwarmBundle(g, "patch"), true);
    assert.equal(g.scrap, 5);
    assert.equal(g.player.kits.swarm?.target, "patch");
    assert.equal(g.player.kits.swarm?.level, 2);
    assert.equal(installSwarmBundle(g, "ward"), false);
    const other = createGame(5);
    other.scrap = 85;
    assert.equal(installSwarmBundle(other, "ward"), true);
    assert.equal(other.scrap, 0);
    assert.equal(other.player.kits.swarm?.target, "ward");
    other.scrap = 84;
    const short = createGame(6);
    short.scrap = 74;
    assert.equal(installSwarmBundle(short, "patch"), false);
  });

  it("defense drone intercepts a missile and then is on cooldown for 1s", () => {
    const g = createGame(2);
    const kit = place(g);
    assert.equal(deploy(g, "ward"), true);
    assert.equal(g.player.parts, 1);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), true);
    assert.equal(kit.cool, 1);
    assert.equal(kit.aux, 1);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), false);
    tickSwarm(g, 0.5);
    assert.equal(kit.cool, 0.5);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), false);
    tickSwarm(g, 0.5);
    assert.equal(kit.cool, 0);
    assert.equal(kit.aux, 0);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), true);
  });

  it("does not intercept a laser", () => {
    const g = createGame(3);
    const kit = place(g);
    deploy(g, "ward");
    assert.equal(swarmIntercept(g, { kind: "laser", from: "enemy" }), false);
    assert.equal(kit.cool, 0);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), true);
  });

  it("mark II does intercept a laser", () => {
    const g = createGame(4);
    const kit = place(g);
    assert.equal(deploy(g, "ward2"), true);
    assert.equal(swarmIntercept(g, { kind: "laser", from: "enemy" }), true);
    assert.equal(kit.cool, DRONE_COOLDOWN_S.ward2);
    assert.equal(swarmIntercept(g, { kind: "laser", from: "enemy" }), false);
    assert.equal(swarmIntercept(g, { kind: "ion", from: "enemy" }), false);
    tickSwarm(g, 1);
    assert.equal(kit.cool, 0);
    assert.equal(swarmIntercept(g, { kind: "ion", from: "enemy" }), true);
  });

  it("a friendly defense drone shoots a Crystal Vengeance shard", () => {
    for (const kind of ["ward", "ward2"] as const) {
      const g = createGame(11);
      const kit = place(g);
      assert.equal(deploy(g, kind), true);
      assert.equal(swarmIntercept(g, { kind: "laser", from: "player", defId: "vengeance" }), true);
      assert.equal(kit.cool, DRONE_COOLDOWN_S[kind]);
    }
    const combat = createGame(12);
    place(combat);
    assert.equal(deploy(combat, "striker"), true);
    assert.equal(swarmIntercept(combat, { kind: "laser", from: "player", defId: "vengeance" }), false);
    assert.equal(combat.player.kits.swarm?.cool, 0);
  });

  it("spends that drone when a hull hit breaks off a shard", () => {
    let saw = false;
    for (let seed = 1; seed < 80 && !saw; seed++) {
      const g = createGame(seed);
      startCombat(g, "scout");
      assert.ok(g.enemy);
      g.asteroid = false;
      g.asb = false;
      for (const w of [...g.player.weapons, ...g.enemy.weapons]) w.enabled = false;
      g.player.systems.engines.power = 0;
      g.player.systems.shields.power = 0;
      g.player.shieldNow = 0;
      g.player.zoltan = 0;
      g.player.hull = 40;
      g.enemy.systems.engines.level = 0;
      g.enemy.systems.engines.power = 0;
      g.enemy.shieldNow = 0;
      g.enemy.zoltan = 0;
      g.augments = ["vengeance"];
      place(g);
      assert.equal(deploy(g, "ward"), true);
      const hull = g.enemy.hull;
      const room = g.player.rooms.find((item) => item.id === "p-weapons") ?? g.player.rooms[0];
      assert.ok(room);
      applyImpact(g, {
        id: "hit",
        kind: "laser",
        from: "enemy",
        damage: 1,
        ion: 0,
        fireChance: 0,
        breachChance: 0,
        targetRoom: room.id,
        wait: 0,
        t: 1,
        duration: 1,
      });
      if (g.log.some((line) => line === "Your defense drone shot the shard down.")) {
        assert.equal(g.enemy.hull, hull);
        saw = true;
      }
    }
    assert.equal(saw, true);
  });

  it("ward shoots flak and an environmental asteroid", () => {
    const g = createGame(5);
    place(g);
    deploy(g, "ward");
    assert.equal(swarmIntercept(g, { kind: "flak", from: "enemy" }), true);
    tickSwarm(g, 1);
    assert.equal(swarmIntercept(g, { kind: "laser", from: "env" }), true);
    tickSwarm(g, 1);
    assert.equal(swarmIntercept(g, { kind: "asteroid", from: "enemy" }), true);
  });

  it("combat drone fires when the orbit leg finishes", () => {
    const g = createGame(6);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.equal(deploy(g, "striker"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    // 180 degrees at Speed 15 is 4 seconds. Shields, Overview: a 90 degree leg is the 2 second layer.
    kit.heading = 0;
    kit.bearing = 180;
    kit.left = orbitLegSeconds(0, 180, COMBAT1_SPEED);
    kit.aux = 0;
    assert.equal(kit.left, 4);
    tickSwarm(g, 3.99);
    assert.equal(g.shots.length, 0);
    assert.equal(swarmCombatShots(g).length, 0);
    tickSwarm(g, 0.01);
    assert.equal(g.shots.length, 1);
    const shot = g.shots[0];
    assert.ok(shot);
    assert.equal(shot.kind, "laser");
    assert.equal(shot.from, "player");
    assert.equal(shot.damage, 1);
    assert.equal(shot.fireChance, 0.1);
    assert.equal(shot.ion, 0);
    assert.equal(shot.breachChance, 0);
    assert.equal(shot.wait, 0);
    assert.ok(shot.duration > 0);
    assert.ok(g.enemy.rooms.some((r) => r.id === shot.targetRoom));
    assert.deepEqual(swarmCombatShots(g), [{ damage: 1, fireChance: 0.1, kind: "laser" }]);
    // The arrival rolled a new leg. Pin a long one so this half-second does not fire again.
    kit.heading = 180;
    kit.bearing = 0;
    kit.left = 4;
    kit.aux = 0;
    tickSwarm(g, 0.5);
    assert.equal(g.shots.length, 1);
    assert.equal(swarmCombatShots(g).length, 0);
  });

  it("keeps orbiting a cloaked enemy and does not fire until the cloak drops", () => {
    for (const kind of ["striker", "combat2"] as const) {
      const g = createGame(kind === "striker" ? 61 : 62);
      const kit = place(g, 4);
      startCombat(g, "scout");
      assert.ok(g.enemy);
      assert.equal(deploy(g, kind), true);
      const speed = kind === "combat2" ? COMBAT2.speed : COMBAT1_SPEED;
      kit.heading = 0;
      kit.bearing = 180;
      kit.left = orbitLegSeconds(0, 180, speed);
      kit.aux = 0;
      g.enemy.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
      const heading = kit.heading;
      const bearing = kit.bearing;
      g.shots = [];
      tickSwarm(g, kit.left);
      assert.equal(
        g.shots.filter((s) => s.from === "player").length,
        0,
        kind,
      );
      assert.equal(swarmCombatShots(g).length, 0, kind);
      assert.notEqual(kit.heading, heading, kind);
      assert.notEqual(kit.bearing, bearing, kind);
      g.enemy.kits.veil.on = false;
      const next = kit.left ?? 0;
      assert.ok(next > 0, kind);
      tickSwarm(g, next);
      assert.equal(
        g.shots.filter((s) => s.from === "player").length,
        1,
        kind,
      );
    }
  });

  it("deploy fails with 0 parts", () => {
    const g = createGame(7);
    const kit = place(g);
    g.player.parts = 0;
    assert.equal(deploy(g, "ward"), false);
    assert.equal(g.player.parts, 0);
    assert.equal(kit.on, false);
    assert.equal(kit.target, null);
  });

  it("an underpowered ward does not intercept", () => {
    const g = createGame(8);
    place(g, 1);
    assert.equal(deploy(g, "ward"), true);
    assert.equal(g.player.parts, 1);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), false);
  });

  it("beam does not hurt a hull that still has shields", () => {
    const g = createGame(9);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.ok(g.enemy.shieldNow > 0);
    assert.equal(DRONE_POWER.beam, 2);
    assert.equal(deploy(g, "beam"), true);
    const hull = g.enemy.hull;
    const shields = g.enemy.shieldNow;
    const bars = Object.values(g.enemy.systems).reduce((sum, sys) => sum + sys.damage, 0);
    tickSwarm(g, 1.5);
    assert.equal(g.enemy.hull, hull);
    tickSwarm(g, 1.5);
    assert.equal(g.enemy.hull, hull);
    assert.equal(g.enemy.shieldNow, shields);
    assert.equal(
      Object.values(g.enemy.systems).reduce((sum, sys) => sum + sys.damage, 0),
      bars,
    );
    assert.equal(g.enemy.rooms.every((r) => r.fire === 0), true);
    assert.equal(swarmCombatShots(g).length, 0);
  });

  it("beam deals 1 hull and 1 system damage per room once shields are down", () => {
    const g = createGame(10);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.shieldNow = 0;
    assert.equal(deploy(g, "beam"), true);
    const hull = g.enemy.hull;
    // The swipe picks one room. A traced hull has halls, so pin the swipe to a system room.
    const systemRoom = g.enemy.rooms.find((r) => r.system);
    assert.ok(systemRoom?.system);
    g.enemy.rooms = [systemRoom];
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    // Beam speed 3 is not the wait. A 90 degree leg at Speed 15 is 2 seconds.
    pinLeg(kit, BEAM1_SPEED);
    assert.equal(kit.left, 2);
    tickSwarm(g, 1.99);
    assert.equal(g.enemy.hull, hull);
    tickSwarm(g, 0.01);
    assert.equal(g.enemy.hull, hull - 1);
    assert.equal(g.enemy.shieldNow, 0);
    const hurt = g.enemy.rooms.filter((r) => r.system && g.enemy!.systems[r.system].damage === 1);
    assert.equal(hurt.length, 1);
    const fires = g.enemy.rooms.reduce((sum, r) => sum + r.fire, 0);
    assert.ok(fires === 0 || fires === 1);
  });

  it("a beam drone does not cut a cloaked hull, and the swipe interval still runs", () => {
    const g = createGame(64);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.shieldNow = 0;
    g.enemy.zoltan = 2;
    const systemRoom = g.enemy.rooms.find((r) => r.system);
    assert.ok(systemRoom?.system);
    const system = systemRoom.system;
    g.enemy.rooms = [systemRoom];
    assert.equal(deploy(g, "beam"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    g.enemy.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    const hull = g.enemy.hull;
    const damage = g.enemy.systems[system].damage;
    pinLeg(kit, BEAM1_SPEED);
    tickSwarm(g, kit.left ?? 0);
    assert.equal(g.enemy.zoltan, 2);
    assert.equal(g.enemy.hull, hull);
    assert.equal(g.enemy.systems[system].damage, damage);
    assert.equal(kit.heading, 90);
    g.enemy.zoltan = 0;
    pinLeg(kit, BEAM1_SPEED);
    tickSwarm(g, kit.left ?? 0);
    assert.equal(g.enemy.hull, hull);
    assert.equal(g.enemy.systems[system].damage, damage);
    assert.equal(g.enemy.zoltan, 0);
    assert.equal(kit.heading, 90);
    g.enemy.kits.veil.on = false;
    pinLeg(kit, BEAM1_SPEED);
    tickSwarm(g, kit.left ?? 0);
    assert.equal(g.enemy.hull, hull - 1);
  });

  it("a player beam drone spends one Zoltan Shield layer and does not cut hull on that swipe", () => {
    const g = createGame(11);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.zoltan = 2;
    g.enemy.shieldNow = 0;
    assert.equal(deploy(g, "beam"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    const hull = g.enemy.hull;
    pinLeg(kit, BEAM1_SPEED);
    tickSwarm(g, kit.left ?? 0);
    assert.equal(g.enemy.zoltan, 1);
    assert.equal(g.enemy.hull, hull);
    pinLeg(kit, BEAM1_SPEED);
    tickSwarm(g, kit.left ?? 0);
    assert.equal(g.enemy.zoltan, 0);
    assert.equal(g.enemy.hull, hull);
    pinLeg(kit, BEAM1_SPEED);
    tickSwarm(g, kit.left ?? 0);
    assert.equal(g.enemy.hull, hull - 1);
  });

  it("beam fire lands on some swipes and not others", () => {
    const g = createGame(11);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.shieldNow = 0;
    deploy(g, "beam");
    tickSwarm(g, 3 * 80);
    const fires = g.enemy.rooms.reduce((sum, r) => sum + r.fire, 0);
    assert.ok(fires > 0);
    assert.ok(fires < 80);
  });

  it("an underpowered beam does not cut", () => {
    const g = createGame(12);
    place(g, 1);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.shieldNow = 0;
    assert.equal(deploy(g, "beam"), true);
    const hull = g.enemy.hull;
    tickSwarm(g, 3);
    assert.equal(g.enemy.hull, hull);
  });

  it("board hits enemy crew through shields, once a second, for 3 to 7 HP", () => {
    const g = createGame(13);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.equal(DRONE_POWER.board, 3);
    assert.ok(g.enemy.shieldNow > 0);
    assert.equal(deploy(g, "board"), true);
    const shields = g.enemy.shieldNow;
    const hull = g.enemy.hull;
    const hp = () =>
      g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy").reduce((sum, c) => sum + c.hp, 0);
    const before = hp();
    const bars = Object.values(g.enemy.systems).reduce((sum, sys) => sum + sys.damage, 0);
    tickSwarm(g, 0.5);
    assert.equal(hp(), before);
    tickSwarm(g, 0.5);
    // Boarding, Combat: "3 to 7 HP, an average of 5 damage per hit."
    const once = before - hp();
    assert.ok(once >= 3 && once <= 7, String(once));
    assert.equal(g.enemy.shieldNow, shields);
    assert.equal(g.enemy.hull, hull);
    const kit = g.player.kits.swarm;
    assert.ok(kit?.room);
    const landed = g.enemy.rooms.find((r) => r.id === kit.room);
    assert.ok(landed);
    assert.ok(landed.breach >= 1);
    assert.equal(
      Object.values(g.enemy.systems).reduce((sum, sys) => sum + sys.damage, 0),
      bars,
    );
    tickSwarm(g, 1);
    const twice = before - hp();
    assert.ok(twice - once >= 3 && twice - once <= 7, String(twice - once));
  });

  it("holds in space while the enemy is cloaked, then breaches and hits for 3 to 7 HP", () => {
    const g = createGame(13);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.equal(deploy(g, "board"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    g.enemy.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    const shields = g.enemy.shieldNow;
    const hull = g.enemy.hull;
    const hp = () =>
      g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy").reduce((sum, c) => sum + c.hp, 0);
    const before = hp();
    const breachBefore = g.enemy.rooms.reduce((sum, r) => sum + r.breach, 0);
    tickSwarm(g, 2);
    assert.equal(hp(), before);
    assert.equal(kit.room, undefined);
    assert.equal(
      g.enemy.rooms.reduce((sum, r) => sum + r.breach, 0),
      breachBefore,
    );
    g.enemy.kits.veil.on = false;
    tickSwarm(g, 1);
    const dealt = before - hp();
    assert.ok(dealt >= 3 && dealt <= 7, String(dealt));
    assert.equal(typeof kit.room, "string");
    assert.ok(kit.room);
    const room = g.enemy.rooms.find((r) => r.id === kit.room);
    assert.ok(room);
    assert.ok(room.breach >= 1);
    assert.equal(g.enemy.shieldNow, shields);
    assert.equal(g.enemy.hull, hull);
  });

  it("board breaks one system bar in 12.5 seconds when no enemy crew are left and still ignores shields", () => {
    const g = createGame(14);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.shieldNow = 4;
    for (const sys of Object.values(g.enemy.systems)) sys.level = Math.max(sys.level, 8);
    const friend = g.crew.find((c) => c.side === "player");
    assert.ok(friend);
    friend.aboard = "enemy";
    friend.room = g.enemy.rooms[0]!.id;
    const friendHp = friend.hp;
    g.crew = g.crew.filter((c) => c.side !== "enemy");
    assert.equal(deploy(g, "board"), true);
    const hull = g.enemy.hull;
    const bars = () => Object.values(g.enemy!.systems).reduce((sum, sys) => sum + sys.damage, 0);
    // Crew skills, Combat skill: 12.5 seconds per bar. The arrival second is still flight.
    tickSwarm(g, 0.5);
    assert.equal(bars(), 0);
    tickSwarm(g, 0.5);
    assert.equal(bars(), 0);
    tickSwarm(g, 12.4);
    assert.equal(bars(), 0);
    tickSwarm(g, 0.1);
    assert.equal(bars(), 1);
    assert.equal(g.enemy.shieldNow, 4);
    assert.equal(g.enemy.hull, hull);
    assert.equal(friend.hp, friendHp);
  });

  it("moves to the nearest system room once that system is destroyed and no enemy crew remain", () => {
    const g = createGame(18);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.equal(deploy(g, "board"), true);
    tickSwarm(g, 1);
    const kit = g.player.kits.swarm;
    assert.ok(kit?.room);
    const from = kit.room;
    const room = g.enemy.rooms.find((r) => r.id === from);
    assert.ok(room?.system);
    const sys = g.enemy.systems[room.system];
    sys.damage = sys.level;
    const guard = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(guard);
    guard.room = from;
    guard.aboard = "enemy";
    tickSwarm(g, 1);
    assert.equal(kit.room, from);
    for (const c of g.crew) if (c.side === "enemy" && c.room === from) c.hp = 0;
    tickSwarm(g, 0.05);
    assert.notEqual(kit.room, from);
    assert.ok(nearestSystem(g.enemy, from).includes(kit.room!));
  });

  it("an underpowered board does not attack", () => {
    const g = createGame(15);
    place(g, 2);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.equal(deploy(g, "board"), true);
    const hp = g.crew.filter((c) => c.side === "enemy").reduce((sum, c) => sum + c.hp, 0);
    tickSwarm(g, 2);
    assert.equal(
      g.crew.filter((c) => c.side === "enemy").reduce((sum, c) => sum + c.hp, 0),
      hp,
    );
  });

  it("patch repairs one bar in 6.25s, an Engi's pace, even with no oxygen", () => {
    const g = createGame(16);
    place(g, 1);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.equal(DRONE_POWER.patch, 1);
    const weapons = g.player.rooms.find((room) => room.system === "weapons")!;
    g.player.systems.weapons.damage = 1;
    g.player.systems.weapons.fix = 0;
    g.enemy.systems.weapons.damage = 1;
    weapons.o2 = 0;
    const power = g.player.systems.weapons.power;
    const playerHull = g.player.hull;
    assert.equal(deploy(g, "patch"), true);
    assert.equal(g.player.parts, 1);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    assert.equal(kit.on, true);
    assert.equal(kit.target, "patch");
    kit.room = weapons.id;
    kit.path = [];
    tickSwarm(g, 6.24);
    assert.equal(g.player.systems.weapons.damage, 1);
    tickSwarm(g, 0.01);
    assert.equal(g.player.systems.weapons.damage, 0);
    assert.equal(g.player.systems.weapons.fix, 0);
    assert.equal(g.player.systems.weapons.power, power);
    assert.equal(g.enemy.systems.weapons.damage, 1);
    assert.equal(g.player.hull, playerHull);
    assert.equal(g.enemy.hull, g.enemy.hullMax);

    weapons.fire = 1;
    tickSwarm(g, 1);
    assert.ok(Math.abs(weapons.fire - (1 - 0.096 * 2)) < 1e-9, String(weapons.fire));
  });

  it("walks to a fire before a damaged Shields room, and to Oxygen when the air is under 25%", () => {
    const g = createGame(18);
    place(g, 1);
    assert.equal(deploy(g, "patch"), true);
    const kit = g.player.kits.swarm!;
    const weapons = g.player.rooms.find((room) => room.system === "weapons")!;
    const shields = g.player.rooms.find((room) => room.system === "shields")!;
    const oxygen = g.player.rooms.find((room) => room.system === "oxygen")!;
    const doors = g.player.rooms.find((room) => room.system === "doors")!;
    g.player.systems.weapons.damage = 1;
    g.player.systems.shields.damage = 1;
    oxygen.fire = 1;
    kit.room = weapons.id;
    kit.path = [];
    tickSwarm(g, 0.01);
    assert.equal(kit.path?.[kit.path.length - 1], oxygen.id);
    assert.equal(g.player.systems.shields.damage, 1);

    for (const room of g.player.rooms) room.o2 = 20;
    oxygen.fire = 0;
    g.player.systems.oxygen.damage = 1;
    weapons.fire = 1;
    kit.room = weapons.id;
    kit.path = [];
    tickSwarm(g, 0.01);
    assert.equal(kit.path?.[kit.path.length - 1], oxygen.id);

    for (const room of g.player.rooms) room.o2 = 100;
    g.player.systems.oxygen.damage = 0;
    weapons.fire = 0;
    oxygen.fire = 0;
    doors.breach = 1;
    doors.venting = false;
    oxygen.fire = 1;
    oxygen.venting = true;
    kit.room = doors.id;
    kit.path = [];
    tickSwarm(g, 0.01);
    assert.equal(kit.path?.[kit.path.length - 1], shields.id);
    assert.equal(doors.breach, 1);
  });

  it("breaks a shut blast door at two hits a second, then walks through", () => {
    const g = createGame(19);
    place(g, 1);
    assert.equal(deploy(g, "patch"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    const weapons = g.player.rooms.find((room) => room.system === "weapons");
    const shields = g.player.rooms.find((room) => room.system === "shields");
    const doorRoom = g.player.rooms.find((room) => room.system === "doors");
    assert.ok(weapons && shields && doorRoom);
    g.player.systems.shields.damage = 1;
    g.player.systems.doors.level = 2;
    g.player.systems.doors.damage = 0;
    for (const c of g.crew) {
      if (c.side === "player" && c.room === doorRoom.id) {
        c.room = weapons.id;
        c.path = [];
      }
    }
    kit.room = weapons.id;
    kit.path = [];
    tickSwarm(g, 0.01);
    const next = kit.path?.[0];
    assert.ok(next);
    const door = g.player.doors.find(
      (item) => item.b !== "void" && ((item.a === weapons.id && item.b === next) || (item.b === weapons.id && item.a === next)),
    );
    assert.ok(door);
    door.open = false;
    door.hp = 0;
    door.stuck = 0;
    kit.move = 0;
    tickSwarm(g, 1);
    assert.equal(door.hp, 8 - DRONE_DOOR_HITS_PER_S);
    assert.equal(door.open, false);
    assert.equal(kit.room, weapons.id);
    tickSwarm(g, 3);
    assert.equal(door.open, true);
    assert.equal(door.stuck, 7);
    assert.equal(door.hp, 0);
    assert.equal(kit.room, weapons.id);
    tickSwarm(g, 1.25);
    assert.equal(kit.room, next);
  });

  it("adds one hull point every 3 seconds, up to a rolled 3–5, then breaks apart", () => {
    assert.equal(HULL_POINT_S, 3);
    const g = createGame(17);
    place(g, 2);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.equal(DRONE_POWER.hull, 2);
    g.player.hull = 4;
    g.enemy.hull = 3;
    assert.equal(deploy(g, "hull"), true);
    assert.equal(g.player.parts, 1);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    assert.equal(kit.on, true);
    assert.equal(kit.target, "hull");
    assert.ok(kit.left >= 3 && kit.left <= 5);
    kit.left = 3;
    kit.aux = 0;
    tickSwarm(g, 2.99);
    assert.equal(g.player.hull, 4);
    tickSwarm(g, 0.02);
    assert.equal(g.player.hull, 5);
    assert.equal(kit.on, true);
    tickSwarm(g, 6);
    assert.equal(g.player.hull, 7);
    assert.equal(kit.on, false);
    assert.equal(kit.lost, REDEPLOY_S);
    assert.equal(g.player.parts, 1);
    assert.equal(g.enemy.hull, 3);
  });

  it("stops when the hull is full, and depowering removes it without the rebuild wait", () => {
    const g = createGame(21);
    place(g, 2);
    g.player.hull = g.player.hullMax - 1;
    assert.equal(deploy(g, "hull"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    kit.left = 5;
    kit.aux = 0;
    tickSwarm(g, 3);
    assert.equal(g.player.hull, g.player.hullMax);
    assert.equal(kit.on, false);
    assert.equal(kit.lost, REDEPLOY_S);

    const dropped = createGame(22);
    place(dropped, 2);
    dropped.player.hull = 4;
    assert.equal(deploy(dropped, "hull"), true);
    const off = dropped.player.kits.swarm;
    assert.ok(off);
    const parts = dropped.player.parts;
    off.power = 0;
    tickSwarm(dropped, 9);
    assert.equal(dropped.player.hull, 4);
    assert.equal(off.on, false);
    assert.equal(off.target, null);
    assert.equal(off.lost ?? 0, 0);
    assert.equal(dropped.player.parts, parts);
    off.power = 2;
    assert.equal(deploy(dropped, "hull"), true);
    assert.equal(dropped.player.parts, parts - 1);
  });

  it("returns the drone part when you jump after two Hull Repair points, and not after it breaks apart", () => {
    const g = createGame(24);
    place(g, 2);
    g.player.hull = 4;
    g.augments = ["recover"];
    assert.equal(deploy(g, "hull"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    kit.left = 5;
    kit.aux = 0;
    tickSwarm(g, 6);
    assert.equal(g.player.hull, 6);
    assert.equal(kit.on, true);
    assert.equal(g.player.parts, 1);
    onPlayerJump(g);
    assert.equal(g.player.parts, 2);
    assert.equal(kit.on, false);

    const done = createGame(25);
    place(done, 2);
    done.player.hull = 4;
    done.augments = ["recover"];
    assert.equal(deploy(done, "hull"), true);
    const dead = done.player.kits.swarm;
    assert.ok(dead);
    dead.left = 3;
    dead.aux = 0;
    tickSwarm(done, 9);
    assert.equal(done.player.hull, 7);
    assert.equal(dead.on, false);
    assert.equal(done.player.parts, 1);
    onPlayerJump(done);
    assert.equal(done.player.parts, 1);
  });

  it("keeps a deployed anti-personnel drone through a jump and turns a combat drone off", () => {
    // Drone Control, Crew Drones: "Crew drones stay on the ship and only need to be redeployed when destroyed."
    const g = createGame(26);
    const personnel = place(g, 2);
    personnel.target = "personnel";
    personnel.on = true;
    personnel.aux = 4;
    onPlayerJump(g);
    assert.equal(personnel.on, true);
    assert.equal(personnel.target, "personnel");
    assert.equal(personnel.aux, 4);

    const repair = createGame(27);
    const patch = place(repair, 1);
    patch.target = "patch";
    patch.on = true;
    patch.aux = 2;
    onPlayerJump(repair);
    assert.equal(patch.on, true);
    assert.equal(patch.aux, 2);

    const combat = createGame(28);
    const striker = place(combat, 2);
    striker.target = "striker";
    striker.on = true;
    striker.aux = 4;
    onPlayerJump(combat);
    assert.equal(striker.on, false);
    assert.equal(striker.aux, 0);
  });

  it("sticks to the system it was standing in when power returns, then walks home", () => {
    const g = createGame(23);
    place(g, 1);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    assert.equal(deploy(g, "patch"), true);
    assert.equal(kit.hp, 25);
    const shields = g.player.rooms.find((room) => room.system === "shields");
    const oxygen = g.player.rooms.find((room) => room.system === "oxygen");
    const sensors = g.player.rooms.find((room) => room.system === "sensors");
    assert.ok(shields && oxygen && sensors);
    sensors.kit = "swarm";
    for (const room of g.player.rooms) room.o2 = 20;
    g.player.systems.shields.damage = 1;
    g.player.systems.oxygen.damage = 1;
    kit.room = shields.id;
    kit.path = [];
    kit.power = 0;
    tickSwarm(g, 0.5);
    assert.equal(kit.room, shields.id);
    assert.deepEqual(kit.path ?? [], []);
    assert.equal(g.player.systems.shields.damage, 1);
    kit.power = 1;
    tickSwarm(g, 0.01);
    assert.equal(kit.stick, shields.id);
    assert.equal(g.player.systems.oxygen.damage, 1);
    g.player.systems.shields.fix = 0;
    tickSwarm(g, 6.24);
    assert.equal(g.player.systems.shields.damage, 1);
    tickSwarm(g, 0.01);
    assert.equal(g.player.systems.shields.damage, 0);
    assert.equal(g.player.systems.oxygen.damage, 1);
    tickSwarm(g, 0.01);
    assert.equal(kit.path?.[kit.path.length - 1], oxygen.id);

    for (const room of g.player.rooms) room.o2 = 100;
    g.player.systems.oxygen.damage = 0;
    g.player.systems.shields.damage = 0;
    kit.room = shields.id;
    kit.path = [];
    kit.home = false;
    kit.stick = undefined;
    tickSwarm(g, 0.01);
    assert.equal(kit.home, true);
    assert.equal(kit.path?.[kit.path.length - 1], sensors.id);
    g.player.systems.shields.damage = 1;
    tickSwarm(g, 0.01);
    assert.equal(kit.path?.[kit.path.length - 1], sensors.id);
    let home = false;
    for (let i = 0; i < 12 && kit.room !== sensors.id; i++) tickSwarm(g, 1.2);
    home = kit.room === sensors.id;
    assert.equal(home, true);
    assert.equal(kit.home, false);
    assert.equal(kit.path?.[kit.path.length - 1], shields.id);
    kit.hp = 0;
    kit.path = [];
    kit.room = sensors.id;
    g.player.systems.shields.damage = 0;
    tickSwarm(g, 1);
    assert.equal(kit.hp, PATCH_HEAL);
    tickSwarm(g, 5);
    assert.equal(kit.hp, 25);
    kit.hp = 10;
    kit.power = 0;
    tickSwarm(g, 1);
    assert.equal(kit.hp, 10);
  });

  it("walks the enemy repair drone to the job instead of appearing there", () => {
    const g = createGame(24);
    place(g, 1);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    const start = enemy.rooms.find((room) => room.system && room.system !== "doors");
    assert.ok(start?.system);
    const dest = enemy.rooms.find((room) => room.system && room.id !== start.id && room.system !== "doors");
    assert.ok(dest?.system);
    for (const door of enemy.doors) {
      if (door.b !== "void") door.open = true;
    }
    enemy.systems[dest.system].damage = 1;
    const patch = unit({ id: "ed-walk", kind: "patch", hp: 20, room: start.id, powered: true });
    enemy.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
      loadout: ["patch"],
      drones: [patch],
    };
    enemy.parts = 3;
    tickSwarm(g, 0.01);
    assert.equal(patch.room, start.id);
    assert.equal(patch.path?.[patch.path.length - 1], dest.id);
    assert.equal(enemy.systems[dest.system].damage, 1);
    const hops = patch.path?.length ?? 0;
    assert.ok(hops > 0);
    for (let i = 0; i < hops; i++) tickSwarm(g, 1.2);
    assert.equal(patch.room, dest.id);
    assert.equal(enemy.systems[dest.system].damage, 1);
    tickSwarm(g, 6.24);
    assert.equal(enemy.systems[dest.system].damage, 1);
    tickSwarm(g, 0.01);
    assert.equal(enemy.systems[dest.system].damage, 0);
    assert.equal(patch.hp, 20);
  });

  it("a redeployed repair drone ignores fires in other rooms until Drone Control is repaired", () => {
    const g = createGame(21);
    place(g, 2);
    assert.equal(deploy(g, "patch"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    const weapons = g.player.rooms.find((room) => room.system === "weapons");
    const shields = g.player.rooms.find((room) => room.system === "shields");
    const oxygen = g.player.rooms.find((room) => room.system === "oxygen");
    assert.ok(weapons && shields && oxygen);
    kit.damage = 1;
    kit.room = weapons.id;
    kit.path = [];
    oxygen.fire = 1;
    g.player.systems.shields.damage = 1;
    tickSwarm(g, 0.01);
    assert.equal(kit.path?.[kit.path.length - 1], oxygen.id);
    assert.equal(kit.coldFires, undefined);

    kit.hp = 1;
    kit.room = weapons.id;
    hurtRoomDrones(g, "player", weapons.id, 2);
    assert.equal(kit.on, false);
    assert.equal(kit.coldFires, true);
    assert.equal(kit.lost, REDEPLOY_S);
    kit.lost = 0;
    assert.equal(deploy(g, "patch"), true);
    assert.equal(kit.coldFires, true);
    kit.room = weapons.id;
    kit.path = [];
    oxygen.fire = 1;
    g.player.systems.shields.damage = 1;
    tickSwarm(g, 0.01);
    assert.equal(kit.path?.[kit.path.length - 1], shields.id);
    assert.equal(oxygen.fire, 1);

    g.player.systems.shields.damage = 0;
    oxygen.fire = 0;
    weapons.fire = 1;
    kit.room = weapons.id;
    kit.path = [];
    tickSwarm(g, 1);
    assert.ok(weapons.fire < 1);
    assert.equal(kit.coldFires, true);

    weapons.fire = 0;
    oxygen.fire = 1;
    kit.damage = 0;
    kit.room = weapons.id;
    kit.path = [];
    tickSwarm(g, 0.01);
    assert.equal(kit.coldFires, undefined);
    assert.equal(kit.path?.[kit.path.length - 1], oxygen.id);
  });

  it("an enemy repair drone keeps that same fire ignore after it is destroyed", () => {
    const g = createGame(25);
    place(g, 1);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    const start = enemy.rooms.find((room) => room.system && room.system !== "doors");
    const dest = enemy.rooms.find((room) => room.system && room.id !== start?.id && room.system !== "doors");
    const burn = enemy.rooms.find((room) => room.id !== start?.id && room.id !== dest?.id);
    assert.ok(start && dest?.system && burn);
    for (const door of enemy.doors) {
      if (door.b !== "void") door.open = true;
    }
    const patch = unit({ id: "ed-cold", kind: "patch", hp: 1, room: start.id });
    enemy.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
      damage: 1,
      loadout: ["patch"],
      drones: [patch],
    };
    enemy.parts = 3;
    hurtRoomDrones(g, "enemy", start.id, 2);
    assert.equal(patch.alive, false);
    assert.equal(patch.coldFires, true);
    patch.cool = 0;
    enemy.systems[dest.system].damage = 1;
    burn.fire = 1;
    tickSwarm(g, 0.01);
    assert.equal(patch.alive, true);
    patch.room = start.id;
    patch.path = [];
    tickSwarm(g, 0.01);
    assert.equal(patch.coldFires, true);
    assert.equal(patch.path?.[patch.path.length - 1], dest.id);
    assert.equal(burn.fire, 1);
    enemy.kits.swarm.damage = 0;
    patch.path = [];
    patch.room = start.id;
    tickSwarm(g, 0.01);
    assert.equal(patch.coldFires, undefined);
    assert.equal(patch.path?.[patch.path.length - 1], burn.id);
  });

  it("finishes the system bar already underway after a killing hit, then breaks apart", () => {
    const g = createGame(27);
    place(g, 2);
    assert.equal(deploy(g, "patch"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    const weapons = g.player.rooms.find((room) => room.system === "weapons");
    assert.ok(weapons);
    kit.room = weapons.id;
    kit.path = [];
    kit.hp = 25;
    const sys = g.player.systems.weapons;
    sys.damage = 2;
    sys.fix = REPAIR_SECONDS - 0.02;
    hurtRoomDrones(g, "player", weapons.id, 60);
    assert.equal(kit.on, true);
    assert.equal(kit.dying, true);
    assert.equal(kit.hp, 0);
    assert.equal(sys.damage, 2);
    assert.ok(sys.fix > 0);
    hurtRoomDrones(g, "player", weapons.id, 60);
    assert.equal(kit.on, true);
    kit.power = 0;
    tickSwarm(g, 0.02);
    assert.equal(sys.damage, 1);
    assert.equal(sys.fix, 0);
    assert.equal(kit.on, false);
    assert.equal(kit.dying, undefined);
    assert.equal(kit.coldFires, true);
    assert.equal(kit.lost, REDEPLOY_S);
  });

  it("dies at once in a fire or a breach and does not keep working that room", () => {
    const fire = createGame(28);
    place(fire, 2);
    assert.equal(deploy(fire, "patch"), true);
    const burning = fire.player.kits.swarm;
    assert.ok(burning);
    const weapons = fire.player.rooms.find((room) => room.system === "weapons");
    assert.ok(weapons);
    burning.room = weapons.id;
    burning.path = [];
    burning.hp = 25;
    fire.player.systems.weapons.damage = 1;
    fire.player.systems.weapons.fix = REPAIR_SECONDS / 2;
    weapons.fire = 1;
    hurtRoomDrones(fire, "player", weapons.id, 60);
    assert.equal(burning.on, false);
    assert.equal(burning.dying, undefined);
    assert.equal(weapons.fire, 1);
    assert.equal(fire.player.systems.weapons.fix, REPAIR_SECONDS / 2);

    const breached = createGame(29);
    place(breached, 2);
    assert.equal(deploy(breached, "patch"), true);
    const kit = breached.player.kits.swarm;
    assert.ok(kit);
    const shields = breached.player.rooms.find((room) => room.system === "shields");
    assert.ok(shields);
    kit.room = shields.id;
    kit.path = [];
    kit.hp = 25;
    breached.player.systems.shields.damage = 1;
    breached.player.systems.shields.fix = REPAIR_SECONDS / 2;
    shields.breach = 1;
    hurtRoomDrones(breached, "player", shields.id, 60);
    assert.equal(kit.on, false);
    assert.equal(kit.dying, undefined);
    assert.equal(shields.breach, 1);
    assert.equal(breached.player.systems.shields.fix, REPAIR_SECONDS / 2);
  });

  it("an enemy repair drone ignores the crew in the room until that one bar is finished", () => {
    const g = createGame(30);
    place(g, 1);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    const dest = enemy.rooms.find((room) => room.system && room.system !== "doors");
    assert.ok(dest?.system);
    const sys = enemy.systems[dest.system];
    sys.damage = 2;
    sys.fix = REPAIR_SECONDS - 2;
    const patch = unit({ id: "ed-dying", kind: "patch", hp: 20, room: dest.id, powered: true });
    enemy.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
      loadout: ["patch"],
      drones: [patch],
    };
    enemy.parts = 3;
    hurtRoomDrones(g, "enemy", dest.id, 60);
    assert.equal(patch.alive, true);
    assert.equal(patch.dying, true);
    assert.equal(patch.hp, 0);
    g.crew.push({
      id: "boarder",
      name: "Human",
      side: "player",
      aboard: "enemy",
      hp: 100,
      maxHp: 100,
      room: dest.id,
      path: [],
      move: 0,
      think: 0,
      tone: 1,
    });
    tickSwarm(g, 0.5);
    assert.equal(patch.alive, true);
    assert.equal(patch.dying, true);
    assert.equal(sys.damage, 2);
    assert.ok(sys.fix > REPAIR_SECONDS - 2);
    tickSwarm(g, 0.5);
    assert.equal(sys.damage, 1);
    assert.equal(sys.fix, 0);
    assert.equal(patch.alive, false);
    assert.equal(patch.dying, undefined);
    assert.equal(patch.coldFires, true);
    assert.equal(patch.cool, REDEPLOY_S);
  });
});

describe("Ion Intruder body", () => {
  it("has 125 health, walks an open door, and does not spend its hp", () => {
    assert.equal(INTRUDER_HP, 125);
    assert.equal(INTRUDER_SPACE_SPEED, 18);
    const g = createGame(41);
    place(g, 3);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    assert.equal(deploy(g, "ionintruder"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    assert.equal(kit.hp, 125);
    const room = enemy.rooms.find((item) => item.system);
    assert.ok(room);
    kit.room = room.id;
    kit.left = 0.05;
    kit.aux = 0;
    const doors = enemy.doors.map((door) => door.hp);
    tickSwarm(g, 0.05);
    assert.equal(kit.room, room.id);
    assert.ok((kit.path ?? []).length > 0);
    assert.deepEqual(enemy.doors.map((door) => door.hp), doors);
    const next = kit.path?.[0];
    tickSwarm(g, 0.6);
    assert.equal(kit.room, next);
    assert.deepEqual(enemy.doors.map((door) => door.hp), doors);
  });

  it("spends two hits a second on a blast door and skips that cooldown once", () => {
    assert.equal(DRONE_DOOR_HITS_PER_S, 2);
    const g = createGame(43);
    place(g, 3);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    assert.equal(deploy(g, "ionintruder"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    const room = enemy.rooms.find((item) => item.system);
    assert.ok(room?.system);
    const away = enemy.rooms.find((item) => item.id !== room.id && item.system !== "doors");
    assert.ok(away);
    for (const c of g.crew) {
      if (c.side !== "enemy") continue;
      c.room = away.id;
      c.aboard = "enemy";
      c.path = [];
    }
    enemy.systems.doors.level = 2;
    enemy.systems.doors.damage = 0;
    kit.room = room.id;
    kit.left = 0.05;
    kit.aux = 0;
    kit.path = [];
    tickSwarm(g, 0.05);
    const next = kit.path?.[0];
    assert.ok(next);
    const door = enemy.doors.find(
      (item) => item.b !== "void" && ((item.a === room.id && item.b === next) || (item.b === room.id && item.a === next)),
    );
    assert.ok(door);
    door.open = false;
    door.hp = 0;
    door.stuck = 0;
    enemy.systems[room.system].ion = [];
    kit.left = 30;
    kit.aux = 0;
    kit.doorHit = undefined;
    kit.doorChew = undefined;
    tickSwarm(g, 0.05);
    assert.ok(Math.abs(door.hp - (8 - 0.05 * DRONE_DOOR_HITS_PER_S)) < 1e-9, String(door.hp));
    assert.equal(door.open, false);
    assert.equal(kit.room, room.id);
    assert.equal(enemy.systems[room.system].ion.length, 3);
    const ion = enemy.systems[room.system].ion.length;
    const left = kit.left;
    tickSwarm(g, 0.05);
    assert.equal(enemy.systems[room.system].ion.length, ion);
    assert.equal(kit.left, left);

    door.hp = 8;
    door.open = false;
    door.coat = undefined;
    room.lock = 12;
    kit.left = 30;
    kit.aux = 0;
    kit.doorHit = undefined;
    kit.doorChew = undefined;
    kit.path = [next];
    kit.room = room.id;
    tickSwarm(g, 1);
    assert.equal(door.hp, 8);
    assert.ok(Math.abs((door.coat ?? 0) - (COATED_DOOR_HITS - DRONE_DOOR_HITS_PER_S)) < 1e-9, String(door.coat));
    assert.equal(door.open, false);
    assert.equal(kit.room, room.id);
    assert.equal(enemy.systems[room.system].ion.length, Math.min(5, ion + 3));
    assert.notEqual(kit.left, 30);
  });

  it("dies at 0 health and waits out the redeploy", () => {
    const g = createGame(42);
    place(g, 3);
    startCombat(g, "scout");
    assert.equal(deploy(g, "ionintruder"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    const room = g.enemy?.rooms.find((item) => item.system);
    assert.ok(room);
    kit.room = room.id;
    kit.left = 30;
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe);
    const away = g.enemy?.rooms.find((item) => item.id !== room.id);
    assert.ok(away);
    for (const c of g.crew) if (c.side === "enemy") c.room = away.id;
    foe.room = room.id;
    foe.aboard = "enemy";
    foe.path = [];
    foe.stun = 0;
    foe.leashed = undefined;
    // One untrained blow is 3 to 7 HP. 125 HP takes more than one blow, then the drone waits out the redeploy.
    tickSwarm(g, 1);
    assert.equal(kit.on, true);
    assert.ok((kit.hp ?? 0) > 0);
    for (let i = 0; i < 80 && (kit.hp ?? 0) > 0; i++) tickSwarm(g, 1);
    assert.equal(kit.on, false);
    assert.equal(kit.hp, 0);
    assert.equal(kit.lost, REDEPLOY_S);
  });

  it("takes 20% more damage from a gold combat crew member", () => {
    const drop = (xp: number) => {
      const g = createGame(42);
      place(g, 3);
      startCombat(g, "scout");
      assert.equal(deploy(g, "ionintruder"), true);
      const kit = g.player.kits.swarm;
      assert.ok(kit);
      const room = g.enemy?.rooms.find((item) => item.system);
      assert.ok(room);
      kit.room = room.id;
      kit.left = 30;
      const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
      assert.ok(foe);
      const away = g.enemy?.rooms.find((item) => item.id !== room.id);
      assert.ok(away);
      for (const c of g.crew) if (c.side === "enemy") c.room = away.id;
      foe.room = room.id;
      foe.path = [];
      foe.stun = 0;
      foe.leashed = undefined;
      foe.kin = "plain";
      foe.skills = { combat: xp };
      const before = kit.hp ?? 0;
      tickSwarm(g, 1);
      return before - (kit.hp ?? 0);
    };
    const plain = drop(0);
    assert.ok(plain >= 3 && plain <= 7, String(plain));
    assert.ok(Math.abs(drop(14) / plain - 1.2) < 1e-9);
  });
});

function hit(partial: Partial<Shot> & Pick<Shot, "kind" | "from" | "damage">): Shot {
  return {
    id: "s",
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: "",
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function unit(partial: Partial<DroneUnit> & Pick<DroneUnit, "id" | "kind">): DroneUnit {
  return { alive: true, powered: true, aux: 0, cool: 0, ...partial };
}

describe("on-board drone damage", () => {
  it("takes half the crew damage, and a drone elsewhere or still in flight does not", () => {
    const g = createGame(11);
    place(g, 3);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.systems.engines.power = 0;
    enemy.shieldNow = 0;
    enemy.zoltan = 0;
    enemy.hull = 40;
    const room = enemy.rooms.find((item) => item.system);
    const other = enemy.rooms.find((item) => item.id !== room?.id);
    assert.ok(room && other);
    assert.equal(deploy(g, "ionintruder"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    kit.room = room.id;
    kit.hp = 125;
    const patch = unit({ id: "ed-patch", kind: "patch", hp: 25, room: room.id });
    const away = unit({ id: "ed-away", kind: "patch", hp: 25, room: other.id });
    const flying = unit({ id: "ed-fly", kind: "ionintruder", hp: 125, room: room.id, fly: 1 });
    enemy.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "patch",
      on: true,
      aux: 0,
      drones: [patch, away, flying],
    };
    applyImpact(g, hit({ kind: "laser", from: "player", damage: 1, targetRoom: room.id }));
    assert.equal(kit.hp, 117.5);
    assert.equal(patch.hp, 17.5);
    assert.equal(away.hp, 25);
    assert.equal(flying.hp, 125);
    assert.equal(kit.on, true);
  });

  it("destroys a drone that cannot cover the half, and leaves the intruder alone on the other hull", () => {
    const g = createGame(12);
    place(g, 3);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.systems.engines.power = 0;
    enemy.shieldNow = 0;
    enemy.zoltan = 0;
    g.player.systems.engines.power = 0;
    g.player.shieldNow = 0;
    g.player.zoltan = 0;
    const room = enemy.rooms.find((item) => item.system);
    const playerRoom = g.player.rooms.find((item) => item.system);
    assert.ok(room && playerRoom);
    assert.equal(deploy(g, "ionintruder"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    kit.room = room.id;
    kit.hp = 7;
    applyImpact(
      g,
      hit({
        kind: "beam",
        from: "player",
        damage: 2,
        defId: "halberd",
        targetRoom: room.id,
        beamRooms: [room.id],
      }),
    );
    assert.equal(kit.on, false);
    assert.ok(g.log.some((line) => /destroys the drone/.test(line)));

    kit.on = true;
    kit.target = "ionintruder";
    kit.room = playerRoom.id;
    kit.hp = 125;
    const board = unit({ id: "ed-board", kind: "board", hp: 150, room: playerRoom.id });
    enemy.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "board",
      on: true,
      aux: 0,
      drones: [board],
    };
    applyImpact(g, hit({ kind: "laser", from: "enemy", damage: 1, targetRoom: playerRoom.id }));
    assert.equal(kit.hp, 125);
    assert.equal(board.hp, 142.5);
    assert.equal(board.alive, true);
  });
});

describe("Zoltans drone depower", () => {
  it("refuses while Zoltan power alone fully powers the deployed drone", () => {
    // Zoltans: the drone cannot be manually de-powered while Zoltans fully power it solely by their power.
    const g = createGame(3);
    startCombat(g, "scout");
    const kit = place(g, 0);
    kit.zoltan = 2;
    const parts = g.player.parts;
    assert.equal(deploy(g, "ward"), true);
    assert.equal(depowerDrone(g), false);
    assert.equal(kit.on, true);
    assert.equal(kit.idle, undefined);
    assert.equal(g.player.parts, parts - 1);

    kit.zoltan = 1;
    assert.equal(depowerDrone(g), true);
    assert.equal(kit.on, true);
    assert.equal(kit.idle, true);
    const spent = g.player.parts;
    assert.equal(deploy(g, "ward"), true);
    assert.equal(kit.idle, undefined);
    assert.equal(g.player.parts, spent);

    kit.zoltan = 2;
    kit.power = 2;
    assert.equal(depowerDrone(g), true);
    assert.equal(kit.idle, true);
  });
});

describe("drone schematic activation", () => {
  it("spends one part the first time a schematic is activated and not again", () => {
    // Drone Control, Overview: activating spends one part only when the drone is not already deployed.
    const g = createGame(8);
    const kit = place(g, 2);
    kit.target = "striker";
    assert.equal(activateDroneSlot(g, 0), true);
    assert.equal(kit.on, true);
    assert.equal(kit.target, "striker");
    assert.equal(g.player.parts, 1);
    assert.equal(activateDroneSlot(g, 0), true);
    assert.equal(g.player.parts, 1);
    assert.equal(activateDroneSlot(g, 1), false);
    assert.equal(g.player.parts, 1);
  });

  it("activates the second loadout slot and repowers without a part", () => {
    // Drone Control, Overview: keys 5-7 are the schematic slots, and a deployed drone is only powered again.
    const g = createGame(9);
    const kit = place(g, 3);
    kit.target = null;
    kit.loadout = ["ward", "striker"];
    assert.equal(activateDroneSlot(g, 1), true);
    assert.equal(kit.target, "striker");
    assert.equal(g.player.parts, 1);
    depowerDrone(g);
    assert.equal(kit.idle, true);
    assert.equal(activateDroneSlot(g, 1), true);
    assert.equal(kit.idle, undefined);
    assert.equal(g.player.parts, 1);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import type { Game, Kit } from "../types.ts";
import {
  DRONE_COOLDOWN_S,
  DRONE_POWER,
  INSTALL_SCRAP,
  INTRUDER_HP,
  INTRUDER_SPACE_SPEED,
  REDEPLOY_S,
  deploy,
  installSwarm,
  installSwarmBundle,
  swarmCombatShots,
  swarmIntercept,
  tickSwarm,
} from "./swarm.ts";

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

  it("combat drone does not fire before 2.5s", () => {
    const g = createGame(6);
    place(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.equal(deploy(g, "striker"), true);
    tickSwarm(g, 2);
    assert.equal(g.shots.length, 0);
    assert.equal(swarmCombatShots(g).length, 0);
    tickSwarm(g, 0.5);
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
    tickSwarm(g, 0.5);
    assert.equal(g.shots.length, 1);
    assert.equal(swarmCombatShots(g).length, 0);
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

  it("beam waits 3s and does not hurt a hull that still has shields", () => {
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
    tickSwarm(g, 1.5);
    assert.equal(g.enemy.hull, hull);
    tickSwarm(g, 1.5);
    assert.equal(g.enemy.hull, hull - 1);
    assert.equal(g.enemy.shieldNow, 0);
    const hurt = g.enemy.rooms.filter((r) => r.system && g.enemy!.systems[r.system].damage === 1);
    assert.equal(hurt.length, 1);
    const fires = g.enemy.rooms.reduce((sum, r) => sum + r.fire, 0);
    assert.ok(fires === 0 || fires === 1);
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

  it("board hits enemy crew through shields, once a second, for 6", () => {
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
    assert.equal(hp(), before - 6);
    assert.equal(g.enemy.shieldNow, shields);
    assert.equal(g.enemy.hull, hull);
    assert.equal(
      Object.values(g.enemy.systems).reduce((sum, sys) => sum + sys.damage, 0),
      bars,
    );
    tickSwarm(g, 1);
    assert.equal(hp(), before - 12);
  });

  it("board damages a system for 6 when no enemy crew are left and still ignores shields", () => {
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
    tickSwarm(g, 0.5);
    assert.equal(
      Object.values(g.enemy.systems).reduce((sum, sys) => sum + sys.damage, 0),
      0,
    );
    tickSwarm(g, 0.5);
    assert.equal(
      Object.values(g.enemy.systems).reduce((sum, sys) => sum + sys.damage, 0),
      6,
    );
    assert.equal(g.enemy.shieldNow, 4);
    assert.equal(g.enemy.hull, hull);
    assert.equal(friend.hp, friendHp);
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

  it("hull deploys and does not invent a hull-per-second", () => {
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
    tickSwarm(g, 30);
    assert.equal(g.player.hull, 4);
    assert.equal(g.enemy.hull, 3);
  });
});

describe("Ion Intruder body", () => {
  it("has 125 health, walks to the next system, and does not spend door hp", () => {
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
    // One untrained crew member hits at 6 HP per second. 125 / 6 is just over 20 seconds.
    tickSwarm(g, 20);
    assert.equal(kit.on, true);
    assert.ok((kit.hp ?? 0) > 0);
    tickSwarm(g, 1);
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
    assert.ok(Math.abs(drop(0) - 6) < 1e-9);
    assert.ok(Math.abs(drop(14) / drop(0) - 1.2) < 1e-9);
  });
});

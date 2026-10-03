import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { installAugment } from "../extras/augments.ts";
import type { KinId } from "../extras/kin.ts";
import { DRONE_COOLDOWN_S, deploy, swarmIntercept, tickSwarm, type SwarmKind } from "../extras/swarm.ts";
import { createGame, startCombat, step } from "../sim.ts";
import type { Game, Shot } from "../types.ts";
import { crystalExtinguishScale } from "./cited-crystal-fire.ts";
import { rockExtinguishScale } from "./cited-rock-fire.ts";

const SHARE = 0.45;

function fight(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.asteroid = false;
  g.asb = false;
  for (const w of [...g.player.weapons, ...g.enemy.weapons]) {
    w.enabled = false;
    w.target = null;
    w.charge = 0;
  }
  return g;
}

function hold(g: Game, roomId: string, posts: { id: string; kin?: KinId }[]) {
  const posted = new Set(posts.map((post) => post.id));
  for (const c of g.crew) {
    if (c.side !== "player") continue;
    c.path = [];
    c.move = 0;
    c.stun = 0;
    c.hp = 400;
    c.maxHp = 400;
    if (!posted.has(c.id)) c.room = "p-pilot";
  }
  for (const post of posts) {
    const crew = g.crew.find((c) => c.id === post.id);
    assert.ok(crew);
    crew.room = roomId;
    crew.path = [];
    crew.kin = post.kin;
  }
  const room = g.player.rooms.find((item) => item.id === roomId);
  assert.ok(room);
  room.fire = 5;
  room.o2 = 100;
  room.fireTick = 0;
  room.breach = 0;
  return room;
}

function burn(g: Game, roomId: string): number {
  const room = g.player.rooms.find((item) => item.id === roomId);
  assert.ok(room);
  const before = room.fire;
  for (let i = 0; i < 20; i++) step(g, 0.05);
  assert.equal(g.phase, "combat");
  return before - room.fire;
}

function close(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} vs ${expected}`);
}

function shot(partial: Pick<Shot, "kind" | "from" | "targetRoom">): Shot {
  return {
    id: "probe",
    damage: 1,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    wait: 0,
    t: 0,
    duration: 0.05,
    ...partial,
  };
}

function openEnemy(g: Game) {
  const enemy = g.enemy;
  assert.ok(enemy);
  enemy.systems.engines.power = 0;
  enemy.systems.engines.level = 0;
  enemy.systems.shields.power = 0;
  enemy.systems.shields.level = 0;
  enemy.shieldNow = 0;
  enemy.zoltan = 0;
}

function armEnemy(g: Game, kind: string, power: number) {
  const enemy = g.enemy;
  assert.ok(enemy);
  enemy.kits.swarm = {
    id: "swarm",
    level: power,
    power,
    left: 0,
    cool: 0,
    target: kind,
    on: true,
    aux: 0,
  };
}

describe("Rock and Crystal extinguish shares", () => {
  it("scales one crew member's 0.45 and leaves everyone else at 0.45", () => {
    const human = fight(1);
    hold(human, "p-medbay", [{ id: "c-ada" }]);
    close(burn(human, "p-medbay"), SHARE);

    const rock = fight(2);
    hold(rock, "p-medbay", [{ id: "c-ada", kin: "stone" }]);
    const rockHp = rock.crew.find((c) => c.id === "c-ada")!.hp;
    close(burn(rock, "p-medbay"), SHARE * rockExtinguishScale());
    assert.equal(rock.crew.find((c) => c.id === "c-ada")!.hp, rockHp);

    const crystal = fight(3);
    hold(crystal, "p-medbay", [{ id: "c-ada", kin: "shard" }]);
    close(burn(crystal, "p-medbay"), SHARE * crystalExtinguishScale());

    const both = fight(4);
    hold(both, "p-medbay", [
      { id: "c-ada" },
      { id: "c-ivo", kin: "stone" },
    ]);
    close(burn(both, "p-medbay"), SHARE + SHARE * rockExtinguishScale());
  });

  it("keeps Fire Suppression at 2 per second on top of a Rock", () => {
    const empty = fight(5);
    empty.augments = ["squall"];
    hold(empty, "p-medbay", []);
    close(burn(empty, "p-medbay"), 2);

    const rock = fight(6);
    rock.augments = ["squall"];
    hold(rock, "p-medbay", [{ id: "c-ada", kin: "stone" }]);
    close(burn(rock, "p-medbay"), 2 + SHARE * rockExtinguishScale());
  });
});

describe("Defense Scrambler", () => {
  it("sells for 80 and is the only one of the four with a store row", () => {
    const g = createGame(7);
    g.scrap = 500;
    assert.equal(installAugment(g, "booster"), false);
    assert.deepEqual(g.augments, []);
    assert.equal(g.scrap, 500);
    assert.equal(installAugment(g, "scrambler"), true);
    assert.deepEqual(g.augments, ["scrambler"]);
    assert.equal(g.scrap, 420);
  });

  it("stops an enemy defense drone aimed at your ship and does not spend its cooldown", () => {
    const open = fight(8);
    openEnemy(open);
    armEnemy(open, "ward", 2);
    const hull = open.enemy!.hull;
    open.shots = [shot({ kind: "missile", from: "player", targetRoom: open.enemy!.rooms[0].id })];
    step(open, 0.05);
    assert.equal(open.enemy!.hull, hull);
    assert.equal(open.enemy!.kits.swarm?.cool, DRONE_COOLDOWN_S.ward);

    const blocked = fight(9);
    blocked.augments = ["scrambler"];
    openEnemy(blocked);
    armEnemy(blocked, "ward", 2);
    const before = blocked.enemy!.hull;
    blocked.shots = [shot({ kind: "missile", from: "player", targetRoom: blocked.enemy!.rooms[0].id })];
    step(blocked, 0.05);
    assert.equal(blocked.enemy!.hull, before - 1);
    assert.equal(blocked.enemy!.kits.swarm?.cool, 0);

    const mark2 = fight(10);
    mark2.augments = ["scrambler"];
    openEnemy(mark2);
    armEnemy(mark2, "ward2", 3);
    const markHull = mark2.enemy!.hull;
    mark2.shots = [shot({ kind: "laser", from: "player", targetRoom: mark2.enemy!.rooms[0].id })];
    step(mark2, 0.05);
    assert.equal(mark2.enemy!.hull, markHull - 1);
    assert.equal(mark2.enemy!.kits.swarm?.cool, 0);
  });

  it("still lets your own defense drone fire, and an enemy combat drone does not intercept", () => {
    const g = fight(11);
    g.augments = ["scrambler"];
    g.player.parts = 2;
    g.player.kits.swarm = {
      id: "swarm",
      level: 3,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    assert.equal(deploy(g, "ward"), true);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), true);
    assert.equal(g.player.kits.swarm?.cool, DRONE_COOLDOWN_S.ward);

    const striker = fight(12);
    openEnemy(striker);
    armEnemy(striker, "striker", 2);
    const hull = striker.enemy!.hull;
    striker.shots = [shot({ kind: "missile", from: "player", targetRoom: striker.enemy!.rooms[0].id })];
    step(striker, 0.05);
    assert.equal(striker.enemy!.hull, hull - 1);
    assert.equal(striker.enemy!.kits.swarm?.cool, 0);
  });

  it("leaves a generated enemy drone schematic undeployed", () => {
    let droneShips = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      g.sector = 5;
      g.sectorName = "Rebel Controlled Sector";
      startCombat(g, "Rebel ship");
      const kit = g.enemy?.kits.swarm;
      if (!kit) continue;
      droneShips += 1;
      assert.equal(kit.target, null);
      assert.equal(kit.on, false);
    }
    assert.ok(droneShips > 0);
  });
});

describe("Drone Reactor Booster", () => {
  function patch(seed: number, boosted: boolean) {
    const g = createGame(seed);
    g.player.parts = 2;
    g.player.kits.swarm = {
      id: "swarm",
      level: 3,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    if (boosted) g.augments = ["booster"];
    assert.equal(deploy(g, "patch"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    kit.room = "p-engines";
    kit.path = ["p-shields"];
    kit.move = 0;
    return { g, kit };
  }

  it("walks one room in 1.2s, or 0.96s when fitted", () => {
    const plain = patch(13, false);
    tickSwarm(plain.g, 1.19);
    assert.equal(plain.kit.room, "p-engines");
    tickSwarm(plain.g, 0.02);
    assert.equal(plain.kit.room, "p-shields");

    const boosted = patch(14, true);
    tickSwarm(boosted.g, 0.95);
    assert.equal(boosted.kit.room, "p-engines");
    tickSwarm(boosted.g, 0.02);
    assert.equal(boosted.kit.room, "p-shields");
  });

  it("does not speed any other drone and still applies no repair rate", () => {
    const others: SwarmKind[] = ["ward", "ward2", "wardcut", "striker", "beam", "board", "hull"];
    for (const kind of others) {
      const g = createGame(15);
      g.augments = ["booster"];
      g.player.parts = 2;
      g.player.kits.swarm = {
        id: "swarm",
        level: 3,
        power: 3,
        left: 0,
        cool: 0,
        target: null,
        on: false,
        aux: 0,
      };
      assert.equal(deploy(g, kind), true, kind);
      const kit = g.player.kits.swarm;
      assert.ok(kit);
      kit.room = "p-engines";
      kit.path = ["p-shields"];
      kit.move = 0;
      tickSwarm(g, 5);
      assert.equal(kit.room, "p-engines", kind);
    }

    const g = createGame(16);
    g.augments = ["booster"];
    g.player.parts = 2;
    g.player.kits.swarm = {
      id: "swarm",
      level: 3,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    startCombat(g, "scout");
    g.player.systems.weapons.damage = 2;
    assert.equal(deploy(g, "patch"), true);
    tickSwarm(g, 30);
    assert.equal(g.player.systems.weapons.damage, 2);
    assert.equal(g.player.hull, g.player.hullMax);
  });
});

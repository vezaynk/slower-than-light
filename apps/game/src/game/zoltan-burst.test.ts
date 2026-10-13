import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roomDroneHp, shownDroneHp } from "./extras/swarm.ts";
import { createGame, startCombat, step } from "./sim.ts";
import type { Crew, DroneUnit, Kit } from "./types.ts";

function body(partial: Pick<Crew, "id" | "name" | "side" | "room"> & Partial<Crew>): Crew {
  return {
    aboard: "player",
    hp: 100,
    maxHp: 100,
    path: [],
    move: 0,
    think: 10,
    tone: 0,
    ...partial,
  };
}

describe("zoltan death burst", () => {
  it("deals 15 HP to an enemy in the same room and not to one elsewhere", () => {
    const g = createGame(1);
    startCombat(g, "scout");
    const spark = body({
      id: "z",
      name: "Zed",
      side: "player",
      room: "p-sensors",
      kin: "spark",
      hp: 0,
      maxHp: 70,
    });
    const ally = body({ id: "ally", name: "Pell", side: "player", room: "p-sensors", hp: 90 });
    const near = body({ id: "near", name: "Near", side: "enemy", room: "p-sensors", hp: 100 });
    const far = body({ id: "far", name: "Far", side: "enemy", room: "p-doors", hp: 80 });
    g.crew.push(spark, ally, near, far);
    step(g, 0);
    assert.equal(near.hp, 85);
    assert.equal(far.hp, 80);
    assert.equal(ally.hp, 90);
    assert.equal(
      g.crew.some((c) => c.id === "z"),
      false,
    );
  });

  it("spares the holder's crew when the Zoltan was mind-controlled", () => {
    // Zoltans, Race characteristics: "No damage to allies, if the exploding Zoltan was mind-controlled".
    const g = createGame(6);
    startCombat(g, "scout");
    const spark = body({
      id: "z",
      name: "Zed",
      side: "player",
      room: "p-sensors",
      kin: "spark",
      hp: 0,
      maxHp: 70,
      leashed: 10,
    });
    const holder = body({ id: "holder", name: "Hold", side: "enemy", room: "p-sensors", hp: 100 });
    const own = body({ id: "own", name: "Own", side: "player", room: "p-sensors", hp: 90 });
    const far = body({ id: "far", name: "Far", side: "player", room: "p-doors", hp: 80 });
    g.crew.push(spark, holder, own, far);
    step(g, 0);
    assert.equal(holder.hp, 100);
    assert.equal(own.hp, 90);
    assert.equal(far.hp, 80);
  });

  it("does not burst when a human dies", () => {
    const g = createGame(2);
    startCombat(g, "scout");
    const plain = body({
      id: "h",
      name: "Hue",
      side: "player",
      room: "p-sensors",
      kin: "plain",
      hp: 0,
    });
    const near = body({ id: "near", name: "Near", side: "enemy", room: "p-sensors", hp: 100 });
    g.crew.push(plain, near);
    step(g, 0);
    assert.equal(near.hp, 100);

    const g2 = createGame(3);
    startCombat(g2, "scout");
    const unmarked = body({
      id: "u",
      name: "Una",
      side: "player",
      room: "p-oxygen",
      hp: 0,
    });
    const near2 = body({ id: "near2", name: "Near2", side: "enemy", room: "p-oxygen", hp: 40 });
    g2.crew.push(unmarked, near2);
    step(g2, 0);
    assert.equal(near2.hp, 40);
  });

  it("takes 7.5 from a drone that has health and is in the room", () => {
    const g = createGame(4);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    const swarm = g.enemy.kits.swarm ?? (g.enemy.kits.swarm = kit());
    swarm.loadout = [];
    const intruder = drone({ id: "ion", kind: "ionintruder", hp: 125, room: "p-sensors" });
    const boarder = drone({ id: "board", kind: "board", hp: 150, room: "p-doors" });
    const repair = drone({ id: "patch", kind: "patch", hp: 25, room: "p-sensors" });
    const orbiter = drone({ id: "orb", kind: "striker", room: "p-sensors" });
    delete orbiter.hp;
    const fragile = drone({ id: "frag", kind: "personnel", hp: 4, room: "p-sensors" });
    swarm.drones = [intruder, boarder, repair, orbiter, fragile];
    g.crew.push(
      body({ id: "z", name: "Zed", side: "player", room: "p-sensors", kin: "spark", hp: 0, maxHp: 70 }),
    );
    step(g, 0);
    assert.equal(intruder.hp, 117.5);
    assert.equal(boarder.hp, 150);
    assert.equal(repair.hp, 17.5);
    // Zoltans: shown health rounds down, so a full drone looks missing 8 while the stored loss stays 7.5.
    assert.equal(shownDroneHp(intruder.hp), 117);
    assert.equal(125 - shownDroneHp(intruder.hp), 8);
    assert.equal(shownDroneHp(repair.hp), 17);
    assert.equal(25 - shownDroneHp(repair.hp), 8);
    assert.equal(shownDroneHp(boarder.hp), 150);
    const shown = roomDroneHp(g.player, g)
      .filter((mark) => mark.room === "p-sensors")
      .map((mark) => mark.shown)
      .sort((a, b) => a - b);
    assert.deepEqual(shown, [17, 117]);
    assert.equal(orbiter.hp, undefined);
    assert.equal(orbiter.alive, true);
    assert.equal(fragile.alive, false);
  });

  it("hits the player's Ion Intruder when an enemy Zoltan dies in its room", () => {
    const g = createGame(5);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    if (g.enemy.kits.cradle) g.enemy.kits.cradle.level = 0;
    const swarm = g.enemy.kits.swarm ?? (g.enemy.kits.swarm = kit());
    swarm.loadout = [];
    const theirs = drone({ id: "ion", kind: "ionintruder", hp: 125, room: "e-weapons" });
    swarm.drones = [theirs];
    g.player.kits.swarm = kit();
    g.player.kits.swarm.on = true;
    g.player.kits.swarm.target = "ionintruder";
    g.player.kits.swarm.hp = 125;
    g.player.kits.swarm.room = "e-weapons";
    g.player.kits.swarm.left = 9;
    g.crew.push(
      body({
        id: "ez",
        name: "Zed",
        side: "enemy",
        aboard: "enemy",
        room: "e-weapons",
        kin: "spark",
        hp: 0,
        maxHp: 70,
      }),
    );
    step(g, 0);
    assert.equal(g.player.kits.swarm.hp, 117.5);
    assert.equal(g.player.kits.swarm.on, true);
    assert.equal(theirs.hp, 125);
    assert.equal(theirs.alive, true);
  });
});

function kit(): Kit {
  return { id: "swarm", level: 1, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function drone(partial: Pick<DroneUnit, "id" | "kind" | "room"> & Partial<DroneUnit>): DroneUnit {
  return { alive: true, powered: true, aux: 0, cool: 0, ...partial };
}

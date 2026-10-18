import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createGame,
  kitBars,
  noteZoltanKits,
  sparePower,
  startCombat,
  step,
  swapZoltanCooldown,
} from "../sim.ts";
import { toggleLeashPower } from "./leash.ts";
import { toggleVeilPower } from "./veil.ts";
import type { Crew, Game } from "../types.ts";

function spark(room: string, id: string): Crew {
  return {
    id,
    name: id,
    side: "player",
    aboard: "player",
    hp: 70,
    maxHp: 70,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin: "energy",
  };
}

function cloak(g: Game, power = 2) {
  g.player.kits.cloaking = {
    id: "cloaking",
    level: 3,
    power,
    left: 0,
    cool: 20,
    target: null,
    on: false,
    aux: 0,
  };
  const room = g.player.rooms.find((r) => r.id === "p-sensors");
  assert.ok(room);
  room.kit = "cloaking";
}

describe("Zoltan cooldown swap", () => {
  it("leaves a Zoltan who was already in the room on the locked reactor bars", () => {
    const g = createGame(3);
    cloak(g);
    g.crew.push(spark("p-sensors", "z"));
    const spare = sparePower(g.player);
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.cloaking!.power, 2);
    assert.equal(sparePower(g.player), spare);
    assert.deepEqual(g.player.kits.cloaking!.swap, ["z"]);
  });

  it("frees one reactor bar when an intruding Zoltan walks into a cooling system", () => {
    // Zoltans, lead: the bar belongs to the room they are standing in.
    const g = createGame(8);
    cloak(g);
    swapZoltanCooldown(g);
    const foe = spark("p-sensors", "intruder");
    foe.side = "enemy";
    g.crew.push(foe);
    const spare = sparePower(g.player);
    swapZoltanCooldown(g);
    noteZoltanKits(g);
    assert.equal(g.player.kits.cloaking!.power, 1);
    assert.equal(g.player.kits.cloaking!.zoltan, 1);
    assert.equal(sparePower(g.player), spare + 1);
  });

  it("frees one reactor bar when a mind-controlled Zoltan walks into their own cooling system", () => {
    const g = createGame(9);
    cloak(g);
    swapZoltanCooldown(g);
    const walker = spark("p-sensors", "walk");
    walker.leashed = 10;
    g.crew.push(walker);
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.cloaking!.power, 1);
  });

  it("frees one reactor bar when a Zoltan walks in, and keeps it free after they leave", () => {
    const g = createGame(4);
    cloak(g);
    const spare = sparePower(g.player);
    swapZoltanCooldown(g);
    assert.deepEqual(g.player.kits.cloaking!.swap, []);
    const walker = spark("p-sensors", "walk");
    g.crew.push(walker);
    swapZoltanCooldown(g);
    noteZoltanKits(g);
    assert.equal(g.player.kits.cloaking!.power, 1);
    assert.equal(g.player.kits.cloaking!.zoltan, 1);
    assert.equal(kitBars(g.player.kits.cloaking), 2);
    assert.equal(sparePower(g.player), spare + 1);

    walker.room = "p-pilot";
    noteZoltanKits(g);
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.cloaking!.power, 1);
    assert.equal(g.player.kits.cloaking!.zoltan, 0);
    assert.equal(kitBars(g.player.kits.cloaking), 1);
    assert.equal(sparePower(g.player), spare + 1);

    // Zoltans: "2 zoltans can free up only 2 reactor power from a previously fully powered level 3" system.
    walker.room = "p-sensors";
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.cloaking!.power, 1);
    assert.equal(sparePower(g.player), spare + 1);
  });

  it("frees only two bars of a full level 3 system with two Zoltans walking in and out", () => {
    const g = createGame(10);
    cloak(g, 3);
    swapZoltanCooldown(g);
    const a = spark("p-sensors", "a");
    const b = spark("p-sensors", "b");
    g.crew.push(a, b);
    for (let i = 0; i < 3; i++) {
      a.room = b.room = "p-sensors";
      swapZoltanCooldown(g);
      a.room = b.room = "p-pilot";
      swapZoltanCooldown(g);
    }
    assert.equal(g.player.kits.cloaking!.power, 1);

    // A new cooldown lets the same Zoltans free bars again.
    g.player.kits.cloaking!.cool = 0;
    swapZoltanCooldown(g);
    g.player.kits.cloaking!.power = 3;
    g.player.kits.cloaking!.cool = 20;
    swapZoltanCooldown(g);
    a.room = "p-sensors";
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.cloaking!.power, 2);
  });

  it("frees one bar per Zoltan who arrives together", () => {
    const g = createGame(5);
    cloak(g, 3);
    swapZoltanCooldown(g);
    g.crew.push(spark("p-sensors", "a"), spark("p-sensors", "b"));
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.cloaking!.power, 1);
  });

  it("will not let the reactor bars be moved by hand while the system cools", () => {
    const g = createGame(6);
    cloak(g, 2);
    toggleVeilPower(g);
    assert.equal(g.player.kits.cloaking!.power, 2);
    g.player.kits.cloaking!.cool = 0;
    toggleVeilPower(g);
    assert.equal(g.player.kits.cloaking!.power, 1);
  });

  it("does not peel shields, and a Mind Control with no cooldown does not peel", () => {
    const g = createGame(7);
    g.player.systems.shields.power = 2;
    g.crew.push(spark("p-shields", "s"));
    const spare = sparePower(g.player);
    swapZoltanCooldown(g);
    swapZoltanCooldown(g);
    assert.equal(g.player.systems.shields.power, 2);
    assert.equal(sparePower(g.player), spare);

    g.player.kits.mind = {
      id: "mind",
      level: 1,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    const bay = g.player.rooms.find((r) => r.id === "p-medbay");
    assert.ok(bay);
    bay.kit = "mind";
    g.crew.push(spark("p-medbay", "m"));
    swapZoltanCooldown(g);
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.mind.power, 1);
    toggleLeashPower(g);
    assert.equal(g.player.kits.mind.power, 0);
  });

  it("peels an enemy cloak the same way, including across a combat tick", () => {
    const g = createGame(8);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
    const room = g.enemy.rooms.find((r) => r.system === "sensors") ?? g.enemy.rooms[0];
    room.kit = "cloaking";
    // Level 2, fully powered: the enemy's ship AI keeps a kit at its free bars (extras/ship-ai.ts).
    g.enemy.kits.cloaking = {
      id: "cloaking",
      level: 2,
      power: 2,
      left: 0,
      cool: 20,
      target: null,
      on: false,
      aux: 0,
    };
    step(g, 0.05);
    assert.equal(g.enemy.kits.cloaking.power, 2);
    g.crew.push({
      id: "ez",
      name: "ez",
      side: "enemy",
      aboard: "enemy",
      hp: 70,
      maxHp: 70,
      room: room.id,
      path: [],
      move: 0,
      think: 0,
      tone: 0,
      kin: "energy",
    });
    step(g, 0.05);
    assert.equal(g.enemy.kits.cloaking.power, 1);
    assert.ok((g.enemy.kits.cloaking.cool ?? 0) > 0);
  });
});

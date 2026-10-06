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
    kin: "spark",
  };
}

function cloak(g: Game, power = 2) {
  g.player.kits.veil = {
    id: "veil",
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
  room.kit = "veil";
}

describe("Zoltan cooldown swap", () => {
  it("leaves a Zoltan who was already in the room on the locked reactor bars", () => {
    const g = createGame(3);
    cloak(g);
    g.crew.push(spark("p-sensors", "z"));
    const spare = sparePower(g.player);
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.veil!.power, 2);
    assert.equal(sparePower(g.player), spare);
    assert.deepEqual(g.player.kits.veil!.swap, ["z"]);
  });

  it("frees one reactor bar when a Zoltan walks in, and keeps it free after they leave", () => {
    const g = createGame(4);
    cloak(g);
    const spare = sparePower(g.player);
    swapZoltanCooldown(g);
    assert.deepEqual(g.player.kits.veil!.swap, []);
    const walker = spark("p-sensors", "walk");
    g.crew.push(walker);
    swapZoltanCooldown(g);
    noteZoltanKits(g);
    assert.equal(g.player.kits.veil!.power, 1);
    assert.equal(g.player.kits.veil!.zoltan, 1);
    assert.equal(kitBars(g.player.kits.veil), 2);
    assert.equal(sparePower(g.player), spare + 1);

    walker.room = "p-pilot";
    noteZoltanKits(g);
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.veil!.power, 1);
    assert.equal(g.player.kits.veil!.zoltan, 0);
    assert.equal(kitBars(g.player.kits.veil), 1);
    assert.equal(sparePower(g.player), spare + 1);

    walker.room = "p-sensors";
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.veil!.power, 0);
    assert.equal(sparePower(g.player), spare + 2);
  });

  it("frees one bar per Zoltan who arrives together", () => {
    const g = createGame(5);
    cloak(g, 3);
    swapZoltanCooldown(g);
    g.crew.push(spark("p-sensors", "a"), spark("p-sensors", "b"));
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.veil!.power, 1);
  });

  it("will not let the reactor bars be moved by hand while the system cools", () => {
    const g = createGame(6);
    cloak(g, 2);
    toggleVeilPower(g);
    assert.equal(g.player.kits.veil!.power, 2);
    g.player.kits.veil!.cool = 0;
    toggleVeilPower(g);
    assert.equal(g.player.kits.veil!.power, 1);
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

    g.player.kits.leash = {
      id: "leash",
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
    bay.kit = "leash";
    g.crew.push(spark("p-medbay", "m"));
    swapZoltanCooldown(g);
    swapZoltanCooldown(g);
    assert.equal(g.player.kits.leash.power, 1);
    toggleLeashPower(g);
    assert.equal(g.player.kits.leash.power, 0);
  });

  it("peels an enemy cloak the same way, including across a combat tick", () => {
    const g = createGame(8);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
    const room = g.enemy.rooms.find((r) => r.system === "sensors") ?? g.enemy.rooms[0];
    room.kit = "veil";
    g.enemy.kits.veil = {
      id: "veil",
      level: 3,
      power: 2,
      left: 0,
      cool: 20,
      target: null,
      on: false,
      aux: 0,
    };
    step(g, 0.05);
    assert.equal(g.enemy.kits.veil.power, 2);
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
      kin: "spark",
    });
    step(g, 0.05);
    assert.equal(g.enemy.kits.veil.power, 1);
    assert.ok((g.enemy.kits.veil.cool ?? 0) > 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG } from "../extras/augments.ts";
import {
  applyIon,
  bars,
  canJumpTo,
  commitJump,
  createGame,
  evasionPercent,
  powerMask,
  sparePower,
  startCombat,
  step,
  zoltanBars,
} from "../sim.ts";
import type { Crew } from "../types.ts";

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

describe("Zoltan power bar", () => {
  it("adds one bar in a main system and ignores ion", () => {
    const shields = { level: 2, power: 0, damage: 0, ion: [5, 5], fix: 0 };
    assert.equal(bars(shields, 0), 0);
    assert.equal(bars(shields, 2), 2);
    assert.equal(bars({ level: 2, power: 2, damage: 0, ion: [], fix: 0 }, 1), 2);
  });

  it("does not power piloting and does not free a reactor bar", () => {
    const g = createGame(11);
    const before = sparePower(g.player);
    g.crew.push(spark("p-pilot", "z-pilot"));
    assert.equal(zoltanBars(g.crew, g.player, "player", "pilot"), 0);
    g.player.systems.shields.power = 2;
    g.player.systems.shields.level = 2;
    g.crew.push(spark("p-shields", "z-shield"));
    assert.equal(bars(g.player.systems.shields, zoltanBars(g.crew, g.player, "player", "shields")), 2);
    assert.equal(sparePower(g.player), before);
  });

  it("powers a weapon and refills oxygen from a Zoltan in that room", () => {
    const g = createGame(12);
    startCombat(g, "scout");
    if (g.enemy) g.enemy.weapons = [];
    g.player.systems.weapons.power = 1;
    g.crew.push(spark("p-weapons", "z-gun"));
    assert.equal(powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"))[0], true);
    g.player.weapons[0].charge = 0;
    step(g, 0.05);
    assert.ok(g.player.weapons[0].charge > 0);

    const quiet = createGame(13);
    startCombat(quiet, "scout");
    if (quiet.enemy) quiet.enemy.weapons = [];
    quiet.player.systems.weapons.power = 1;
    quiet.player.weapons[0].charge = 0;
    step(quiet, 0.05);
    assert.equal(quiet.player.weapons[0].charge, 0);

    const air = createGame(14);
    startCombat(air, "scout");
    if (air.enemy) air.enemy.weapons = [];
    air.player.systems.oxygen.power = 0;
    for (const room of air.player.rooms) room.o2 = 50;
    air.crew.push(spark("p-oxygen", "z-air"));
    step(air, 0.05);
    const oxygen = air.player.rooms.find((room) => room.id === "p-oxygen");
    assert.ok(oxygen);
    assert.ok(oxygen.o2 > 50);
  });

  it("keeps one shield layer from two Zoltans while the system is ionized", () => {
    const g = createGame(15);
    startCombat(g, "scout");
    if (g.enemy) g.enemy.weapons = [];
    g.player.systems.shields.level = 2;
    g.player.systems.shields.power = 2;
    g.player.systems.shields.ion = [5, 5];
    g.player.shieldNow = 0;
    g.player.shieldCharge = 0;
    g.crew.push(spark("p-shields", "z-a"), spark("p-shields", "z-b"));
    for (let i = 0; i < 50; i++) step(g, 0.05);
    assert.equal(g.player.shieldNow, 1);
  });

  it("gives engines a bar and leaves evasion at zero when that Zoltan stands in piloting", () => {
    const g = createGame(16);
    g.player.systems.engines.power = 0;
    const pilot = g.crew.find((c) => c.room === "p-pilot");
    assert.ok(pilot);
    const away = g.crew.find((c) => c.room === "p-engines");
    assert.ok(away);
    away.room = "p-medbay";
    assert.equal(evasionPercent(g, g.player, "player"), 0);
    g.crew.push(spark("p-engines", "z-eng"));
    // Engines level 1 is 5, and the Zoltan and the pilot each add the untrained 5.
    assert.equal(evasionPercent(g, g.player, "player"), 15);
    g.crew = g.crew.filter((c) => c.id !== "z-eng");
    g.crew.push(spark("p-pilot", "z-chair"));
    assert.equal(evasionPercent(g, g.player, "player"), 0);
  });

  it("does not man an ionized console, and further ion stops at 5", () => {
    // Zoltans: "The ion-lock status, preventing manning the system console, is not removed,
    // and ion damage can accumulate up to a maximum of 5".
    const g = createGame(21);
    g.player.systems.engines.level = 2;
    g.player.systems.engines.power = 2;
    g.player.systems.engines.damage = 0;
    g.player.systems.engines.ion = [5];
    const pilot = g.crew.find((c) => c.room === "p-pilot");
    assert.ok(pilot);
    pilot.path = [];
    const seated = g.crew.find((c) => c.room === "p-engines");
    assert.ok(seated);
    seated.room = "p-medbay";
    seated.path = [];
    g.crew.push(spark("p-engines", "z-ion"));
    // Level 2 engines are 10. The Zoltan bar keeps that table. Ion blocks the engines manning +5. Piloting adds 5.
    assert.equal(evasionPercent(g, g.player, "player"), 15);
    g.player.systems.engines.ion = [];
    assert.equal(evasionPercent(g, g.player, "player"), 20);
    applyIon(g.player, "engines", 6);
    assert.equal(g.player.systems.engines.ion.length, 5);
    assert.ok(g.player.systems.engines.ion.every((t) => t === 5));
    applyIon(g.player, "engines", 4);
    assert.equal(g.player.systems.engines.ion.length, 5);
  });
});

describe("Adv. FTL Navigation", () => {
  it("is sold for 50", () => {
    const row = CATALOG.find((item) => item.id === "nav");
    assert.ok(row);
    assert.equal(row.name, "Adv. FTL Navigation");
    assert.equal(row.cost, 50);
  });

  it("jumps to a visited beacon, including one the fleet overtook, and still spends fuel", () => {
    const g = createGame(17);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here);
    const dest = g.beacons.find((b) => b.id !== here.id && !here.links.includes(b.id));
    assert.ok(dest);
    dest.visited = true;
    assert.equal(canJumpTo(g, dest.id), false);
    const fuel = g.fuel;
    commitJump(g, dest.id);
    assert.equal(g.here, here.id);
    assert.equal(g.fuel, fuel);

    g.augments = ["nav"];
    assert.equal(canJumpTo(g, dest.id), true);
    dest.col = 0;
    g.fleet = 4;
    assert.equal(canJumpTo(g, dest.id), true);
    const unvisited = g.beacons.find((b) => b.id !== here.id && b.id !== dest.id && !b.visited);
    if (unvisited && !here.links.includes(unvisited.id)) assert.equal(canJumpTo(g, unvisited.id), false);
    commitJump(g, dest.id);
    assert.equal(g.here, dest.id);
    assert.equal(g.fuel, fuel - 1);
  });
});

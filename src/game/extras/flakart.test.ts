import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, createGame, evasionPercent, rand, sparePower, startCombat } from "../sim.ts";
import type { Game, Shot } from "../types.ts";
import { ACQUIRE_S, deploy, enemyDefenseIntercept, shotHitsDrone, swarmIntercept, tickSwarm } from "./swarm.ts";
import {
  CHARGE_SECONDS,
  DAMAGE,
  FAKE_FLAK,
  FAKE_LABEL,
  FLAK_CUTS,
  POWER_BARS,
  PROJECTILES,
  SOLD_IN_STORES,
  UPGRADE_COSTS,
  armFlak,
  chargeFlakSeconds,
  flakAimRolls,
  flakLanding,
  lowerFlakPower,
  raiseFlakPower,
  tickFlak,
  type FlakAimRoom,
} from "./flakart.ts";

function fight(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  assert.ok(g.enemy.rooms.length >= 2);
  return g;
}

/** A fully powered kit. Charge time then matches the installed level: 50/40/30/20. */
function armFed(g: Game, level: 1 | 2 | 3 | 4): void {
  armFlak(g, level);
  const kit = g.player.kits.flak;
  assert.ok(kit);
  kit.power = level;
}

function realOf(shots: readonly Shot[]): Shot[] {
  return shots.filter((shot) => shot.kind === "flak");
}

function fakeOf(shots: readonly Shot[]): Shot[] {
  return shots.filter((shot) => shot.label === FAKE_LABEL);
}

/** One burst: 7 damaging flak, then the 7 decoys were pushed ahead of them. */
function expectBurst(shots: readonly Shot[], from: "player" | "enemy" = "player"): void {
  const reals = realOf(shots);
  const fakes = fakeOf(shots);
  assert.equal(reals.length, PROJECTILES);
  assert.equal(fakes.length, FAKE_FLAK);
  assert.equal(shots.length, PROJECTILES + FAKE_FLAK);
  for (let i = 0; i < FAKE_FLAK; i++) assert.equal(shots[i]?.label, FAKE_LABEL);
  for (const shot of fakes) {
    assert.equal(shot.from, from);
    assert.equal(shot.kind, "missile");
    assert.equal(shot.damage, 0);
    assert.equal(shot.ion, 0);
    assert.equal(shot.fireChance, 0);
    assert.equal(shot.breachChance, 0);
    assert.equal(shot.offRoom, undefined);
    assert.equal(shot.label, FAKE_LABEL);
  }
  for (const shot of reals) {
    assert.equal(shot.from, from);
    assert.equal(shot.damage, DAMAGE);
    assert.equal(shot.kind, "flak");
    assert.equal(shot.ion, 0);
    assert.equal(shot.fireChance, 0);
    assert.equal(shot.breachChance, 0);
    assert.equal(shot.label, undefined);
  }
}

describe("flak burst", () => {
  it("records the upgrade table and does not sell", () => {
    assert.equal(chargeFlakSeconds(1), 50);
    assert.equal(chargeFlakSeconds(2), 40);
    assert.equal(chargeFlakSeconds(3), 30);
    assert.equal(chargeFlakSeconds(4), 20);
    assert.deepEqual(CHARGE_SECONDS, { 1: 50, 2: 40, 3: 30, 4: 20 });
    assert.deepEqual(UPGRADE_COSTS, { 2: 30, 3: 50, 4: 80 });
    assert.deepEqual(POWER_BARS, { 1: 1, 2: 2, 3: 3, 4: 4 });
    assert.equal(PROJECTILES, 7);
    assert.equal(FAKE_FLAK, 7);
    assert.equal(DAMAGE, 1);
    assert.equal(SOLD_IN_STORES, false);
  });

  it("arms without a store and stores the level on the kit", () => {
    const g = createGame(1);
    const scrap = g.scrap;
    armFlak(g, 3);
    assert.equal(g.scrap, scrap);
    assert.equal(g.player.kits.flak?.level, 3);
    assert.equal(g.player.kits.flak?.aux, 0);
  });

  it("holds the spool until the level clock, then pushes seven shots and seven fakes", () => {
    const g = fight(2);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    armFed(g, 1);
    tickFlak(g, 49);
    assert.equal(g.shots.length, 0);
    tickFlak(g, 1);
    expectBurst(g.shots);
    assert.equal(g.enemy.hull, hull);
    const rooms = new Set(g.enemy.rooms.map((r) => r.id));
    for (const shot of g.shots) assert.ok(rooms.has(shot.targetRoom));
  });

  it("uses the shorter clocks at higher levels", () => {
    for (const level of [2, 3, 4] as const) {
      const g = fight(level + 10);
      armFed(g, level);
      const seconds = chargeFlakSeconds(level);
      tickFlak(g, seconds - 1);
      assert.equal(g.shots.length, 0);
      tickFlak(g, 1);
      expectBurst(g.shots);
    }
  });

  it("accumulates partial ticks and fires once", () => {
    const g = fight(5);
    armFed(g, 4);
    tickFlak(g, 10);
    tickFlak(g, 10);
    assert.equal(g.shots.length, 14);
    tickFlak(g, 19);
    assert.equal(g.shots.length, 14);
    tickFlak(g, 1);
    assert.equal(g.shots.length, 28);
  });

  it("does not spool while paused, unarmed, or out of a fight", () => {
    const idle = createGame(6);
    armFlak(idle, 1);
    tickFlak(idle, 50);
    assert.equal(idle.shots.length, 0);

    const g = fight(7);
    tickFlak(g, 50);
    assert.equal(g.shots.length, 0);

    armFed(g, 1);
    tickFlak(g, 25);
    g.paused = true;
    tickFlak(g, 100);
    assert.equal(g.shots.length, 0);
    g.paused = false;
    tickFlak(g, 24);
    assert.equal(g.shots.length, 0);
    tickFlak(g, 1);
    assert.equal(g.shots.length, 14);
  });

  it("waits for an enemy hull, then spreads on the next tick", () => {
    const g = fight(8);
    assert.ok(g.enemy);
    const rooms = g.enemy.rooms;
    g.enemy.rooms = [];
    armFed(g, 1);
    tickFlak(g, 50);
    assert.equal(g.shots.length, 0);
    g.enemy.rooms = rooms;
    tickFlak(g, 0.01);
    assert.equal(g.shots.length, 14);
  });

  it("keeps two fights on separate clocks", () => {
    const a = fight(9);
    const b = fight(10);
    armFed(a, 4);
    armFed(b, 1);
    tickFlak(a, 20);
    tickFlak(b, 20);
    assert.equal(a.shots.length, 14);
    assert.equal(b.shots.length, 0);
  });

  it("does not let a fake pellet drop a shield, a zoltan bubble, or hull", () => {
    const g = fight(11);
    assert.ok(g.enemy);
    const base = g.enemy.rooms[0];
    g.enemy.rooms = [{ ...base, id: "b", x: 0, y: 0, w: 2, h: 2, omit: undefined }];
    g.enemy.systems.engines.level = 0;
    g.enemy.systems.engines.power = 0;
    if (g.enemy.kits.veil) g.enemy.kits.veil.on = false;
    g.enemy.zoltan = 5;
    g.enemy.shieldNow = 8;
    const hull = g.enemy.hull;
    if (g.enemy.kits.flak) g.enemy.kits.flak.on = false;
    armFed(g, 1);
    g.player.kits.flak!.aux = 50;
    tickFlak(g, 0.01);
    expectBurst(g.shots);
    assert.equal(evasionPercent(g, g.enemy, "enemy"), 0);
    const before = g.log.length;
    for (const shot of fakeOf(g.shots)) applyImpact(g, shot);
    assert.equal(g.enemy.shieldNow, 8);
    assert.equal(g.enemy.zoltan, 5);
    assert.equal(g.enemy.hull, hull);
    assert.equal(g.log.slice(before).some((line) => line.toLowerCase().includes("swarm")), false);
    g.enemy.zoltan = 0;
    for (const shot of realOf(g.shots)) applyImpact(g, shot);
    assert.equal(g.enemy.shieldNow, 1);
    assert.equal(g.enemy.hull, hull);
  });

  it("lets a defense drone shoot a fake pellet", () => {
    const g = fight(12);
    assert.ok(g.enemy);
    g.enemy.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
      loadout: ["ward"],
    };
    g.enemy.parts = 3;
    tickSwarm(g, 0.05);
    tickSwarm(g, ACQUIRE_S);
    if (g.enemy.kits.flak) g.enemy.kits.flak.on = false;
    armFed(g, 1);
    g.player.kits.flak!.aux = 50;
    tickFlak(g, 0.01);
    const fake = fakeOf(g.shots)[0];
    assert.ok(fake);
    assert.equal(enemyDefenseIntercept(g, fake), true);
    assert.equal(enemyDefenseIntercept(g, fake), false);

    g.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    g.player.parts = 2;
    assert.equal(deploy(g, "ward"), true);
    const incoming: Shot = { ...fake, from: "enemy" };
    assert.equal(swarmIntercept(g, incoming), true);
  });

  it("can meet a drone in the line of fire", () => {
    let hits = 0;
    for (let seed = 1; seed <= 250 && hits === 0; seed++) {
      const g = fight(seed);
      assert.ok(g.enemy);
      g.enemy.kits.swarm = {
        id: "swarm",
        level: 2,
        power: 2,
        left: 0,
        cool: 0,
        target: null,
        on: false,
        aux: 0,
        loadout: ["ward"],
      };
      g.enemy.parts = 3;
      tickSwarm(g, 0.05);
      if (g.enemy.kits.flak) g.enemy.kits.flak.on = false;
      armFed(g, 1);
      g.player.kits.flak!.aux = 50;
      tickFlak(g, 0.01);
      const fake = fakeOf(g.shots)[0];
      assert.ok(fake);
      if (shotHitsDrone(g, fake)) hits += 1;
    }
    assert.equal(hits, 1);
  });

  it("charges a level 4 kit with one bar on the 50 second clock", () => {
    const g = fight(21);
    armFlak(g, 4);
    const kit = g.player.kits.flak;
    assert.ok(kit);
    kit.power = 1;
    // A Zoltan stamp is not a reactor bar. One filled bar is still the 50s clock.
    kit.zoltan = 1;
    tickFlak(g, 20);
    assert.equal(g.shots.length, 0);
    assert.equal(kit.aux, 20);
    tickFlak(g, 29);
    assert.equal(g.shots.length, 0);
    assert.equal(kit.aux, 49);
    tickFlak(g, 1);
    expectBurst(g.shots);
  });

  it("stops adding bars at the cap and removes one bar", () => {
    const g = createGame(22);
    armFlak(g, 2);
    const kit = g.player.kits.flak;
    assert.ok(kit);
    const missing = 2 - sparePower(g.player);
    if (missing > 0) g.player.reactor += missing;
    raiseFlakPower(g);
    raiseFlakPower(g);
    assert.equal(kit.power, 2);
    assert.equal(kit.on, true);
    const spare = sparePower(g.player);
    raiseFlakPower(g);
    assert.equal(kit.power, 2);
    assert.equal(sparePower(g.player), spare);
    lowerFlakPower(g);
    assert.equal(kit.power, 1);
    lowerFlakPower(g);
    assert.equal(kit.power, 0);
    assert.equal(kit.on, false);

    kit.level = 3;
    kit.damage = 1;
    const need = 2 - sparePower(g.player);
    if (need > 0) g.player.reactor += need;
    raiseFlakPower(g);
    raiseFlakPower(g);
    raiseFlakPower(g);
    assert.equal(kit.power, 2);
    g.player.reactor -= sparePower(g.player);
    assert.ok(sparePower(g.player) < 1);
    raiseFlakPower(g);
    assert.equal(kit.power, 2);
  });

  it("drains a full bar in 2 seconds when off, unpowered, or destroyed", () => {
    // Flak Artillery, Overview: "Powering off drains charge quickly."
    // INFERRED: a full bar of the installed level empties in 2 seconds. The page prints no duration.
    const emptied = (seed: number, level: 1 | 4, full: number, setup: (kit: NonNullable<Game["player"]["kits"]["flak"]>) => void) => {
      const g = fight(seed);
      armFlak(g, level);
      const kit = g.player.kits.flak;
      assert.ok(kit);
      kit.aux = full;
      setup(kit);
      tickFlak(g, 1);
      assert.equal(kit.aux, full / 2);
      assert.equal(g.shots.length, 0);
      tickFlak(g, 1);
      assert.equal(kit.aux, 0);
      assert.equal(g.shots.length, 0);
    };
    emptied(30, 1, 50, (kit) => {
      kit.power = 0;
      kit.on = true;
    });
    emptied(31, 4, 20, (kit) => {
      kit.power = 4;
      kit.on = false;
    });
    emptied(32, 4, 20, (kit) => {
      kit.power = 4;
      kit.on = true;
      kit.damage = 4;
    });

    const paused = fight(33);
    armFlak(paused, 4);
    const held = paused.player.kits.flak;
    assert.ok(held);
    held.power = 0;
    held.aux = 20;
    paused.paused = true;
    tickFlak(paused, 2);
    assert.equal(held.aux, 20);

    const idle = createGame(34);
    armFlak(idle, 1);
    const parked = idle.player.kits.flak;
    assert.ok(parked);
    parked.aux = 50;
    tickFlak(idle, 2);
    assert.equal(parked.aux, 50);
  });

  it("divides the charge clock by the Automated Re-loader rate", () => {
    // Flak Artillery, Overview: "Automated Re-loaders work."
    // Augmentations, Automated Re-loader: one copy divides cooldown by 1.1; three raise firing rate by 30%.
    const once = fight(40);
    armFed(once, 1);
    once.augments.push("feed");
    tickFlak(once, 50 / 1.1 - 0.05);
    assert.equal(once.shots.length, 0);
    tickFlak(once, 0.1);
    expectBurst(once.shots);

    const triple = fight(41);
    armFed(triple, 1);
    triple.augments.push("feed", "feed", "feed");
    tickFlak(triple, 50 / 1.3 - 0.05);
    assert.equal(triple.shots.length, 0);
    tickFlak(triple, 0.1);
    expectBurst(triple.shots);

    const draining = fight(42);
    armFlak(draining, 1);
    draining.augments.push("feed", "feed", "feed");
    const kit = draining.player.kits.flak;
    assert.ok(kit);
    kit.power = 0;
    kit.on = true;
    kit.aux = 50;
    tickFlak(draining, 1);
    assert.equal(kit.aux, 25);
    assert.equal(draining.shots.length, 0);
  });

  it("does not charge or fire while the enemy ship is cloaked", () => {
    // Cloaking, Overview: artillery systems stop charging and cannot target a cloaked ship.
    // The 20 second beam exception names Artillery Beam, not Flak Artillery.
    const g = fight(43);
    armFed(g, 4);
    assert.ok(g.enemy);
    g.enemy.kits.veil = {
      id: "veil",
      level: 1,
      power: 1,
      left: 10,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
    };
    const kit = g.player.kits.flak;
    assert.ok(kit);
    tickFlak(g, 20);
    assert.equal(kit.aux, 0);
    assert.equal(g.shots.length, 0);
  });
});

const bp = (n: number) => n / 10000;

const narrow: FlakAimRoom = { id: "n", x: 1, y: 0, w: 1, h: 2 };
const west: FlakAimRoom = { id: "w", x: 0, y: 0, w: 1, h: 1 };
const east: FlakAimRoom = { id: "e", x: 2, y: 0, w: 1, h: 2 };
const vertical = [narrow, west, east];

const wide: FlakAimRoom = { id: "n", x: 0, y: 1, w: 2, h: 1 };
const northL: FlakAimRoom = { id: "nl", x: 0, y: 0, w: 1, h: 1 };
const northR: FlakAimRoom = { id: "nr", x: 1, y: 0, w: 1, h: 1 };
const southL: FlakAimRoom = { id: "sl", x: 0, y: 2, w: 1, h: 1 };
const horizontal = [wide, northL, northR, southL];

describe("flak room odds", () => {
  it("keeps a 1x2 shot in the room under 60.90 percent", () => {
    assert.equal(FLAK_CUTS[0], 6090 / 10000);
    assert.equal(FLAK_CUTS[1], (6090 + 978) / 10000);
    assert.equal(FLAK_CUTS[2], (6090 + 978 * 2) / 10000);
    assert.equal(FLAK_CUTS[3], (6090 + 978 * 3) / 10000);
    assert.equal(flakAimRolls(narrow), true);
    assert.deepEqual(flakLanding(vertical, "n", 0), { kind: "stay" });
    assert.deepEqual(flakLanding(vertical, "n", bp(6089)), { kind: "stay" });
  });

  it("puts the other 1x2 shots on the four long-side tiles at 9.78 percent", () => {
    assert.deepEqual(flakLanding(vertical, "n", FLAK_CUTS[0]), { kind: "room", roomId: "w" });
    assert.deepEqual(flakLanding(vertical, "n", bp(6090 + 978 - 1)), { kind: "room", roomId: "w" });
    // The east room covers both tiles on that side. The second west tile is empty.
    assert.deepEqual(flakLanding(vertical, "n", FLAK_CUTS[1]), { kind: "miss" });
    assert.deepEqual(flakLanding(vertical, "n", FLAK_CUTS[2]), { kind: "room", roomId: "e" });
    assert.deepEqual(flakLanding(vertical, "n", FLAK_CUTS[3]), { kind: "room", roomId: "e" });
    assert.deepEqual(flakLanding(vertical, "n", bp(9999)), { kind: "room", roomId: "e" });
  });

  it("uses the same split on a 2x1, north then south", () => {
    // INFERRED: the wiki prints the 1x2 line only. A 2x1 is that rectangle turned.
    assert.equal(flakAimRolls(wide), true);
    assert.deepEqual(flakLanding(horizontal, "n", FLAK_CUTS[0]), { kind: "room", roomId: "nl" });
    assert.deepEqual(flakLanding(horizontal, "n", FLAK_CUTS[1]), { kind: "room", roomId: "nr" });
    assert.deepEqual(flakLanding(horizontal, "n", FLAK_CUTS[2]), { kind: "room", roomId: "sl" });
    assert.deepEqual(flakLanding(horizontal, "n", FLAK_CUTS[3]), { kind: "miss" });
  });

  it("keeps a 2x2 shot in that room and does not treat the roll as a split", () => {
    const box: FlakAimRoom = { id: "b", x: 0, y: 0, w: 2, h: 2 };
    assert.equal(flakAimRolls(box), false);
    assert.deepEqual(flakLanding([box, west], "b", 0), { kind: "stay" });
    assert.deepEqual(flakLanding([box, west], "b", 0.99), { kind: "stay" });
  });

  it("leaves shapes with no printed percent on the aimed room", () => {
    // INFERRED: the wiki prints no percent for these shapes.
    const one: FlakAimRoom = { id: "o", x: 0, y: 0, w: 1, h: 1 };
    const three: FlakAimRoom = { id: "t", x: 0, y: 0, w: 3, h: 1 };
    const punched: FlakAimRoom = { id: "p", x: 0, y: 0, w: 2, h: 2, omit: [{ x: 1, y: 1 }] };
    assert.equal(flakAimRolls(one), false);
    assert.equal(flakAimRolls(three), false);
    assert.equal(flakAimRolls(punched), false);
    assert.deepEqual(flakLanding([one, three, punched], "o", 0.99), { kind: "stay" });
    assert.deepEqual(flakLanding([one, three, punched], "t", 0.1), { kind: "stay" });
    assert.deepEqual(flakLanding([one, three, punched], "p", 0.5), { kind: "stay" });
  });

  it("rolls each pellet of a burst aimed at one 1x2 room", () => {
    const g = fight(2);
    assert.ok(g.enemy);
    const base = g.enemy.rooms[0];
    g.enemy.rooms = [{ ...base, id: "n", x: 1, y: 0, w: 1, h: 2, omit: undefined }];
    if (g.enemy.kits.flak) g.enemy.kits.flak.on = false;
    armFed(g, 1);
    g.player.kits.flak!.aux = 50;
    g.seed = 4;
    const preview = createGame(0);
    preview.seed = 4;
    const rolls = [rand(preview), rand(preview), rand(preview), rand(preview), rand(preview), rand(preview), rand(preview)];
    tickFlak(g, 0.01);
    const reals = realOf(g.shots);
    assert.equal(reals.length, 7);
    assert.equal(fakeOf(g.shots).length, 7);
    for (const shot of fakeOf(g.shots)) {
      assert.equal(shot.damage, 0);
      assert.equal(shot.targetRoom, "n");
      assert.equal(shot.offRoom, undefined);
    }
    const aim: FlakAimRoom = { id: "n", x: 1, y: 0, w: 1, h: 2 };
    reals.forEach((shot, i) => {
      const land = flakLanding([aim], "n", rolls[i]);
      assert.equal(shot.damage, 1);
      assert.equal(shot.targetRoom, "n");
      assert.equal(shot.offRoom, land.kind === "miss" ? true : undefined);
    });
    assert.ok(rolls.some((roll) => roll < FLAK_CUTS[0]));
    assert.ok(rolls.some((roll) => roll >= FLAK_CUTS[0]));
  });

  it("does not roll a lone 2x2 room", () => {
    const g = fight(2);
    assert.ok(g.enemy);
    const base = g.enemy.rooms[0];
    g.enemy.rooms = [{ ...base, id: "b", x: 0, y: 0, w: 2, h: 2, omit: undefined }];
    if (g.enemy.kits.flak) g.enemy.kits.flak.on = false;
    armFed(g, 1);
    g.player.kits.flak!.aux = 50;
    g.seed = 4;
    tickFlak(g, 0.01);
    assert.equal(g.seed, 4);
    expectBurst(g.shots);
    for (const shot of g.shots) {
      assert.equal(shot.targetRoom, "b");
      assert.equal(shot.offRoom, undefined);
    }
    for (const shot of realOf(g.shots)) assert.equal(shot.damage, 1);
  });
});

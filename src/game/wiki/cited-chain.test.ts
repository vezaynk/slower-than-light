import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import type { Game, WeaponInst } from "../types.ts";
import { chainChargeSeconds, chainIonAmount, nextChainStep } from "./cited-chain.ts";

/** Laser (Weapons), Chain Burst Laser. */
const BURST = [16, 13, 10, 7];
/** Laser (Weapons), Chain Vulcan. The first five sum to the printed 35.5s spin-up. */
const VULCAN = [11.1, 9.1, 7.1, 5.1, 3.1, 1.1];
/** Ion (Weapons), Chain Ion. Charge stays 14s. 4 × 14 is the printed 56s. */
const ION = [1, 2, 3, 4];

function close(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} vs ${expected}`);
}

function mount(g: Game, defId: string, power: number): WeaponInst {
  assert.ok(g.enemy);
  g.enemy.hull = 400;
  g.enemy.hullMax = 400;
  for (const w of g.enemy.weapons) w.enabled = false;
  const veil = g.enemy.kits.veil;
  if (veil) {
    veil.power = 0;
    veil.on = false;
    veil.left = 0;
  }
  const spike = g.enemy.kits.spike;
  if (spike) {
    spike.power = 0;
    spike.on = false;
    spike.left = 0;
  }
  g.player.systems.weapons.level = Math.max(g.player.systems.weapons.level, power);
  g.player.systems.weapons.power = power;
  g.player.systems.weapons.damage = 0;
  g.player.systems.weapons.ion = [];
  g.autofireAll = true;
  const target = g.enemy.rooms[0]?.id ?? "e-pilot";
  g.player.weapons = [{ uid: "chain", defId, charge: 0, enabled: true, autofire: true, target }];
  return g.player.weapons[0];
}

function unman(g: Game) {
  for (const c of g.crew) {
    if (c.side === "player" && c.room === "p-weapons") c.room = "p-sensors";
  }
}

/** One unmanned 0.05s tick from an empty charge. */
function rate(g: Game): number {
  const w = g.player.weapons[0];
  w.charge = 0;
  step(g, 0.05);
  return w.charge;
}

function fire(g: Game) {
  const w = g.player.weapons[0];
  w.charge = 1;
  const before = g.shots.length;
  step(g, 0.05);
  const fired = g.shots.slice(before).filter((s) => s.from === "player" && s.defId === w.defId);
  g.shots = g.shots.filter((s) => s.from !== "player");
  return fired;
}

describe("chain weapon profiles", () => {
  it("stores the printed steps and stays on the last one", () => {
    BURST.forEach((seconds, i) => assert.equal(chainChargeSeconds("chainlaser", i), seconds));
    assert.equal(chainChargeSeconds("chainlaser", 9), 7);
    VULCAN.forEach((seconds, i) => assert.equal(chainChargeSeconds("vulcan", i), seconds));
    assert.equal(chainChargeSeconds("vulcan", 9), 1.1);
    close(VULCAN.slice(0, 5).reduce((sum, n) => sum + n, 0), 35.5);
    ION.forEach((ion, i) => assert.equal(chainIonAmount("chainion", i), ion));
    assert.equal(chainIonAmount("chainion", 9), 4);
    assert.equal(chainChargeSeconds("chainion", 0), null);
    assert.equal(nextChainStep("chainlaser", 2), 3);
    assert.equal(nextChainStep("chainlaser", 3), 3);
    assert.equal(nextChainStep("spark", 0), null);
  });

  it("steps Chain Burst through 16, 13, 10, then 7, and a manned gun uses the 0.9 rate", () => {
    const g = createGame(4);
    startCombat(g, "scout");
    const w = mount(g, "chainlaser", 2);
    unman(g);
    for (const seconds of BURST) {
      close(rate(g), 0.05 / seconds);
      const shots = fire(g);
      assert.equal(shots.length, 2);
      assert.ok(shots.every((s) => s.damage === 1 && s.ion === 0));
    }
    assert.equal(w.chain, 3);
    close(rate(g), 0.05 / 7);

    const manned = createGame(5);
    startCombat(manned, "scout");
    mount(manned, "chainlaser", 2);
    close(rate(manned), 0.05 / (16 * 0.9));
  });

  it("steps Chain Vulcan down to 1.1 and resets to 11.1 when power drops", () => {
    const g = createGame(6);
    startCombat(g, "scout");
    const w = mount(g, "vulcan", 4);
    unman(g);
    for (const seconds of VULCAN) {
      close(rate(g), 0.05 / seconds);
      const shots = fire(g);
      assert.equal(shots.length, 1);
      assert.equal(shots[0].damage, 1);
    }
    assert.equal(w.chain, 5);
    close(rate(g), 0.05 / 1.1);

    w.chain = 4;
    w.charge = 0.55;
    g.player.systems.weapons.power = 0;
    step(g, 0.05);
    assert.equal(w.chain, 0);
    assert.equal(w.charge, 0);
    g.player.systems.weapons.power = 4;
    close(rate(g), 0.05 / 11.1);

    w.chain = 2;
    w.charge = 1;
    w.enabled = false;
    step(g, 0.05);
    assert.equal(w.chain, 0);
    assert.equal(w.charge, 0);
  });

  it("climbs Chain Ion from 1 to 4 and keeps the 14 second charge", () => {
    const g = createGame(7);
    startCombat(g, "scout");
    const w = mount(g, "chainion", 3);
    unman(g);
    const seen: number[] = [];
    for (let n = 0; n < 5; n++) {
      close(rate(g), 0.05 / 14);
      const shots = fire(g);
      assert.equal(shots.length, 1);
      seen.push(shots[0].ion);
    }
    assert.deepEqual(seen, [1, 2, 3, 4, 4]);
    assert.equal(w.chain, 3);

    w.chain = 3;
    w.charge = 0.4;
    g.player.systems.weapons.ion = [5, 5, 5];
    step(g, 0.05);
    assert.equal(w.chain, 0);
    assert.equal(w.charge, 0);
  });

  it("pauses a chain on a cloaked enemy and leaves an ordinary gun's charge when it loses power", () => {
    const g = createGame(8);
    startCombat(g, "scout");
    const w = mount(g, "chainlaser", 2);
    unman(g);
    fire(g);
    fire(g);
    assert.equal(w.chain, 2);
    w.charge = 0.4;
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.kits.veil = {
      id: "veil",
      level: 1,
      power: 1,
      left: 5,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
    };
    step(g, 0.05);
    assert.equal(w.chain, 2);
    assert.equal(w.charge, 0.4);

    const plain = createGame(9);
    startCombat(plain, "scout");
    const spark = mount(plain, "spark", 1);
    unman(plain);
    spark.charge = 0.4;
    plain.player.systems.weapons.power = 0;
    step(plain, 0.05);
    assert.equal(spark.charge, 0.4);
    assert.equal(spark.chain, undefined);
  });
});

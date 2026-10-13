import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, createGame, fireReady, rand, startCombat } from "../sim.ts";
import { ACQUIRE_S, enemyDefenseIntercept, tickSwarm } from "./swarm.ts";
import {
  FLAK1_FAKE,
  FLAK1_FAKE_LABEL,
  FLAK1_NARROW_CUTS,
  FLAK1_WIDE_CUTS,
  ORDNANCE,
  bombIgnores,
  flak1AimRolls,
  flak1Landing,
  type FlakRoom,
} from "./ordnance.ts";

describe("ordnance", () => {
  it("includes both a flak gun and a bomb", () => {
    const kinds = new Set(ORDNANCE.map((w) => w.kind));
    assert.ok(kinds.has("flak"));
    assert.ok(kinds.has("bomb"));
  });

  it("gives Flak I at least three pellets", () => {
    const scatter = ORDNANCE.find((w) => w.name === "Flak I");
    assert.ok(scatter);
    assert.ok(scatter.shots >= 3);
  });

  it("makes the Fire Bomb spend a missile and ignore shields and evasion", () => {
    const cask = ORDNANCE.find((w) => w.name === "Fire Bomb");
    assert.ok(cask);
    assert.equal(cask.ammo, true);
    assert.equal(bombIgnores(cask), true);
  });
});

const narrow: FlakRoom = { id: "aim", x: 1, y: 1, w: 2, h: 1 };
const north: FlakRoom = { id: "north", x: 1, y: 0, w: 2, h: 1 };
const square: FlakRoom = { id: "box", x: 0, y: 0, w: 2, h: 2 };
const beside: FlakRoom = { id: "beside", x: 0, y: -1, w: 2, h: 1 };

describe("Flak I room odds", () => {
  it("keeps the printed 1x2 and 2x2 cuts", () => {
    // Flak (Weapons), Flak Gun Mark I. The last 1x2 corner is 0.18 because the printed percents sum to 99.99.
    assert.equal(FLAK1_NARROW_CUTS[0], 0.4421);
    assert.equal(FLAK1_NARROW_CUTS[4], 0.4421 + 0.1196 * 4);
    assert.equal(FLAK1_NARROW_CUTS[6], 0.4421 + 0.1196 * 4 + 0.0363 * 2);
    assert.equal(FLAK1_NARROW_CUTS[FLAK1_NARROW_CUTS.length - 1], 1);
    assert.equal(FLAK1_WIDE_CUTS[0], 0.8408);
    assert.equal(FLAK1_WIDE_CUTS[FLAK1_WIDE_CUTS.length - 1], 1);
    assert.equal(flak1AimRolls(narrow), true);
    assert.equal(flak1AimRolls(square), true);
    assert.equal(flak1AimRolls({ id: "dot", x: 0, y: 0, w: 1, h: 1 }), false);
  });

  it("stays in a 1x2 on the main-room roll and steps onto a long side, a short side, or a corner", () => {
    assert.deepEqual(flak1Landing([narrow, north], "aim", 0.442), { kind: "stay" });
    assert.deepEqual(flak1Landing([narrow, north], "aim", 0.4421), { kind: "room", roomId: "north" });
    // First short-side tile is west of the pair, which is empty here.
    assert.deepEqual(flak1Landing([narrow, north], "aim", 0.4421 + 0.1196 * 4), { kind: "miss" });
    // First corner is also empty.
    assert.deepEqual(flak1Landing([narrow], "aim", 0.4421 + 0.1196 * 4 + 0.0363 * 2), { kind: "miss" });
  });

  it("stays in a 2x2 on the main-room roll and can leave through a side tile", () => {
    assert.deepEqual(flak1Landing([square, beside], "box", 0.8407), { kind: "stay" });
    assert.deepEqual(flak1Landing([square, beside], "box", 0.8408), { kind: "room", roomId: "beside" });
    assert.deepEqual(flak1Landing([square], "box", 0.99), { kind: "miss" });
  });
});

describe("Flak I fake flak", () => {
  it("adds three damage-0 decoys that do not roll and do not drop shields", () => {
    assert.equal(FLAK1_FAKE, 3);
    const g = createGame(7);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
    g.enemy.systems.engines.level = 0;
    g.enemy.systems.engines.power = 0;
    g.enemy.shieldNow = 4;
    g.enemy.zoltan = 2;
    const hull = g.enemy.hull;
    const base = g.enemy.rooms[0];
    g.enemy.rooms = [
      { ...base, id: "n", x: 1, y: 1, w: 2, h: 1, omit: undefined },
      { ...base, id: "north", title: "North", system: null, x: 1, y: 0, w: 2, h: 1, omit: undefined },
    ];
    g.player.systems.weapons.level = 2;
    g.player.systems.weapons.power = 2;
    g.player.weapons = [{ uid: "flak", defId: "scatter", charge: 1, enabled: true, autofire: false, target: "n" }];
    g.seed = 4;
    const preview = createGame(1);
    preview.seed = 4;
    const rolls = [rand(preview), rand(preview), rand(preview)];
    fireReady(g);
    const fakes = g.shots.filter((shot) => shot.label === FLAK1_FAKE_LABEL);
    const reals = g.shots.filter((shot) => shot.kind === "flak");
    assert.equal(fakes.length, 3);
    assert.equal(reals.length, 3);
    assert.equal(g.shots.length, 6);
    for (let i = 0; i < 3; i++) assert.equal(g.shots[i]?.label, FLAK1_FAKE_LABEL);
    for (const shot of fakes) {
      assert.equal(shot.kind, "missile");
      assert.equal(shot.damage, 0);
      assert.equal(shot.targetRoom, "n");
      assert.equal(shot.offRoom, undefined);
    }
    const aim: FlakRoom[] = [
      { id: "n", x: 1, y: 1, w: 2, h: 1 },
      { id: "north", x: 1, y: 0, w: 2, h: 1 },
    ];
    reals.forEach((shot, i) => {
      const land = flak1Landing(aim, "n", rolls[i]);
      assert.equal(shot.damage, 1);
      if (land.kind === "stay") assert.equal(shot.targetRoom, "n");
      else if (land.kind === "room") assert.equal(shot.targetRoom, land.roomId);
      else assert.equal(shot.offRoom, true);
    });
    for (const shot of fakes) applyImpact(g, shot);
    assert.equal(g.enemy.shieldNow, 4);
    assert.equal(g.enemy.zoltan, 2);
    assert.equal(g.enemy.hull, hull);
  });

  it("lets a defense drone shoot a fake pellet", () => {
    const g = createGame(8);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
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
    g.player.systems.weapons.level = 2;
    g.player.systems.weapons.power = 2;
    g.player.weapons = [{ uid: "flak", defId: "scatter", charge: 1, enabled: true, autofire: false, target: g.enemy.rooms[0]!.id }];
    fireReady(g);
    const fake = g.shots.find((shot) => shot.label === FLAK1_FAKE_LABEL);
    assert.ok(fake);
    assert.equal(enemyDefenseIntercept(g, fake), true);
    assert.equal(enemyDefenseIntercept(g, fake), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import { applyImpact, createGame, startCombat } from "../sim.ts";
import type { Game, Ship, Shot } from "../types.ts";
import { vengeanceChance, vengeanceFires, vengeanceShot } from "./cited-vengeance.ts";

describe("Crystal Vengeance shot", () => {
  it("uses a 10 percent chance", () => {
    assert.equal(vengeanceChance(), 0.1);
  });

  it("records every shot field from the Crystal Vengeance bullet", () => {
    const shot = vengeanceShot();
    assert.deepEqual(Object.keys(shot), [
      "damage",
      "breach",
      "stunChance",
      "stunSeconds",
      "ignoresShields",
      "evasion",
      "defenseDrone",
    ]);
    assert.equal(shot.damage, 1);
    assert.equal(shot.breach, 0.1);
    assert.equal(shot.stunChance, 0.2);
    assert.equal(shot.stunSeconds, 3);
    assert.equal(shot.ignoresShields, true);
    assert.equal(shot.evasion, true);
    assert.equal(shot.defenseDrone, true);
  });

  it("fires only for a roll in [0, 0.1)", () => {
    assert.equal(vengeanceFires(0), true);
    assert.equal(vengeanceFires(0.05), true);
    assert.equal(vengeanceFires(0.1 - 1e-12), true);
    assert.equal(vengeanceFires(vengeanceChance()), false);
    assert.equal(vengeanceFires(0.1), false);
    assert.equal(vengeanceFires(0.1 + 1e-12), false);
    assert.equal(vengeanceFires(-1e-12), false);
    assert.equal(vengeanceFires(1), false);
    assert.equal(vengeanceFires(Number.NaN), false);
  });
});

function park(ship: Ship) {
  ship.systems.engines.level = 0;
  ship.systems.engines.power = 0;
  ship.systems.shields.level = 0;
  ship.systems.shields.power = 0;
  ship.shieldNow = 0;
  ship.zoltan = 0;
}

function fight(): Game {
  const g = createGame(40);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.asteroid = false;
  g.asb = false;
  g.player.weapons = [];
  g.enemy.weapons = [];
  g.augments = ["CRYSTAL_SHARDS"];
  park(g.player);
  park(g.enemy);
  return g;
}

function hitPlayer(g: Game) {
  const room = g.player.rooms.find((item) => item.system) ?? g.player.rooms[0];
  assert.ok(room);
  const shot: Shot = {
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
  };
  applyImpact(g, shot);
}

describe("Crystal Vengeance numbers from the gap mod", () => {
  it("follows a gap file that changes whether the shard fires", () => {
    loadPack(
      packFromFtl([
        { path: "data/gap.xml", xml: `<FTL><crystalVengeance chance="0" damage="9"/></FTL>` },
      ]),
      "append",
    );
    try {
      const quiet = fight();
      const hull = quiet.enemy!.hull;
      const player = quiet.player.hull;
      hitPlayer(quiet);
      assert.equal(quiet.player.hull, player - 1);
      assert.equal(quiet.enemy!.hull, hull);
    } finally {
      resetPackForTests();
    }

    loadPack(
      packFromFtl([
        { path: "data/gap.xml", xml: `<FTL><crystalVengeance chance="1" damage="4"/></FTL>` },
      ]),
      "append",
    );
    try {
      const g = fight();
      const hull = g.enemy!.hull;
      const player = g.player.hull;
      hitPlayer(g);
      assert.equal(g.player.hull, player - 1);
      assert.equal(g.enemy!.hull, hull - 4);
    } finally {
      resetPackForTests();
    }
    assert.equal(vengeanceChance(), 0.1);
    assert.equal(vengeanceShot().damage, 1);
  });
});

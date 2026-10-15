import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { upgradeCost } from "../content.ts";
import { buy, createGame, upgrade } from "../sim.ts";
import type { Game, Kit, KitId, SysId } from "../types.ts";
import { citedStock, storeSections } from "../wiki/cited-stores.ts";
import { SYSTEM_TUNES } from "../wiki/system-tunes.ts";
import "./base.ts";
import { allSystems, allTunes, loadPack, resetPackForTests, tuneDef } from "./registry.ts";

afterEach(() => resetPackForTests());

function reseed(g: Game, ok: (g: Game) => boolean): Game {
  for (let i = 0; i < 3000; i++, g.seed += 39) if (ok(g)) return g;
  assert.fail("no seed rolls that store");
}

function kit(id: KitId, level = 1): Kit {
  return { id, level, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function ownEveryPricedSystem(g: Game) {
  g.player.systems.shields.level = 1;
  g.player.systems.medbay.level = 1;
  g.player.systems.sensors.level = 1;
  g.player.systems.doors.level = 1;
  g.player.kits.cradle = kit("cradle");
  g.player.kits.sling = kit("sling");
  g.player.kits.veil = kit("veil");
  g.player.kits.leash = kit("leash");
  g.player.kits.spike = kit("spike");
  g.player.kits.cell = kit("cell");
  g.player.kits.swarm = kit("swarm", 2);
}

describe("system tunes", () => {
  it("prices each owned level from the pack", () => {
    for (const tune of SYSTEM_TUNES) {
      assert.equal(tuneDef(tune.id)?.start, tune.start);
      for (const step of tune.costs) assert.equal(upgradeCost(tune.id as SysId, step.level), step.cost);
    }
    assert.equal(upgradeCost("sensors", 3), null);
    assert.equal(upgradeCost("doors", 0), 60);
    assert.equal(upgradeCost("reactor", 8), 20);
    assert.equal(upgradeCost("reactor", 25), null);
  });

  it("spends the packed shields step and leaves the authored row", () => {
    const shields = tuneDef("shields");
    assert.ok(shields);
    loadPack(
      {
        tunes: [
          {
            ...shields,
            costs: shields.costs.map((step) => (step.level === 1 ? { ...step, cost: 7 } : { ...step })),
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    g.player.systems.shields.level = 1;
    g.scrap = 40;
    upgrade(g, "shields");
    assert.equal(g.player.systems.shields.level, 2);
    assert.equal(g.scrap, 33);
    assert.equal(SYSTEM_TUNES.find((row) => row.id === "shields")?.costs.find((step) => step.level === 1)?.cost, 100);
  });

  it("installs shields at the packed start", () => {
    const shields = tuneDef("shields");
    assert.ok(shields);
    loadPack({ tunes: [{ ...shields, start: 3 }] }, "append");
    const g = createGame(1);
    ownEveryPricedSystem(g);
    g.player.systems.shields.level = 0;
    reseed(g, (game) => storeSections(game).includes("systems"));
    const hit = citedStock(g).find((item) => item.ref === "shields");
    assert.ok(hit);
    g.scrap = hit.cost;
    g.stock = citedStock(g);
    buy(g, hit.id);
    assert.equal(g.scrap, 0);
    assert.equal(g.player.systems.shields.level, 3);
    assert.equal(g.player.systems.shields.power, 0);
    assert.equal(SYSTEM_TUNES.find((row) => row.id === "shields")?.start, 2);
  });

  it("stores a tune that is not a system and leaves the shelf alone", () => {
    loadPack({ tunes: [{ id: "ember", start: 4, costs: [{ level: 1, cost: 9 }] }] }, "append");
    assert.equal(tuneDef("ember")?.start, 4);
    assert.equal(allTunes().at(-1)?.id, "ember");
    assert.equal(
      allSystems().some((row) => row.id === "ember" || row.id === "engines"),
      false,
    );
    const g = createGame(1);
    g.player.systems.shields.level = 1;
    g.scrap = 100;
    upgrade(g, "shields");
    assert.equal(g.scrap, 0);
    assert.equal(g.player.systems.shields.level, 2);
  });
});

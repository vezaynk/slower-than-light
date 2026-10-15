import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buy, createGame } from "../sim.ts";
import type { Game, Kit, KitId } from "../types.ts";
import { citedStock, storeSections, type StoreSection } from "../wiki/cited-stores.ts";
import { CITED_SYSTEMS } from "../wiki/system-catalog.ts";
import "./base.ts";
import { loadPack, resetPackForTests, systemDef } from "./registry.ts";

afterEach(() => resetPackForTests());

function reseed(g: Game, ok: (g: Game) => boolean): Game {
  for (let i = 0; i < 3000; i++, g.seed += 39) if (ok(g)) return g;
  assert.fail("no seed rolls that store");
}

function rolls(...want: StoreSection[]) {
  return (g: Game) => want.every((kind) => storeSections(g).includes(kind));
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

describe("system listings", () => {
  it("charges the packed price for a system and a kit", () => {
    const shields = systemDef("shields");
    const veil = systemDef("veil");
    assert.ok(shields && veil);
    loadPack(
      {
        systems: [
          { ...shields, name: "Bulwark", cost: 200 },
          { ...veil, name: "Shroud", cost: 70 },
        ],
      },
      "append",
    );

    const g = createGame(1);
    ownEveryPricedSystem(g);
    g.player.systems.shields.level = 0;
    reseed(g, rolls("systems"));
    const hit = citedStock(g).find((item) => item.ref === "shields");
    assert.ok(hit);
    assert.equal(hit.name, "Bulwark");
    assert.equal(hit.cost, 200);
    assert.equal(CITED_SYSTEMS.find((row) => row.ref === "shields")?.cost, 125);
    g.scrap = 200;
    g.stock = citedStock(g);
    buy(g, hit.id);
    assert.equal(g.scrap, 0);
    assert.equal(g.player.systems.shields.level, 2);
    assert.equal(g.player.systems.shields.power, 0);

    const cloak = createGame(1);
    ownEveryPricedSystem(cloak);
    delete cloak.player.kits.veil;
    reseed(cloak, rolls("systems"));
    const row = citedStock(cloak).find((item) => item.ref === "veil");
    assert.ok(row);
    assert.equal(row.name, "Shroud");
    assert.equal(row.cost, 70);
    cloak.scrap = 70;
    cloak.stock = citedStock(cloak);
    buy(cloak, row.id);
    assert.equal(cloak.scrap, 0);
    const installed = cloak.player.kits as Partial<Record<string, Kit>>;
    assert.equal(installed.veil?.level, 1);
  });

  it("stocks an appended listing and does not install an unknown id", () => {
    loadPack({ systems: [{ id: "ember", name: "Ember", cost: 15, slot: "kit" }] }, "append");
    const g = createGame(1);
    ownEveryPricedSystem(g);
    reseed(g, rolls("systems"));
    const hit = citedStock(g).find((item) => item.ref === "ember");
    assert.ok(hit);
    assert.equal(hit.name, "Ember");
    assert.equal(hit.cost, 15);
    assert.equal(
      citedStock(g).some((item) => item.ref === "swarm" || item.ref === "lance" || item.ref === "flak"),
      false,
    );
    g.scrap = 15;
    g.stock = citedStock(g);
    buy(g, hit.id);
    assert.equal(g.scrap, 15);
    assert.equal("ember" in g.player.kits, false);
    assert.equal(g.player.systems.shields.level, 1);
  });
});

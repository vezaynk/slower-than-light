import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { upgradeCost } from "../content.ts";
import { buy, createGame, upgrade } from "../sim.ts";
import type { Game, Kit, KitId, SysId } from "../types.ts";
import { citedStock, storeSections } from "../wiki/cited-stores.ts";
import "./base.ts";
import { allSystems, allTunes, loadPack, resetPackForTests, tuneDef } from "@stl/pack";

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
  g.player.kits.clonebay = kit("clonebay");
  g.player.kits.teleporter = kit("teleporter");
  g.player.kits.cloaking = kit("cloaking");
  g.player.kits.mind = kit("mind");
  g.player.kits.hacking = kit("hacking");
  g.player.kits.battery = kit("battery");
  g.player.kits.drones = kit("drones", 2);
}

describe("system tunes", () => {
  it("prices each owned level from the pack", () => {
    // Wiki citations:
    // > "Zoltan Cruiser Noether (Layout B) starts with Shields system at level 1 (or, simply, Shields-1), which can be upgraded to Shields-2 for 100 scrap without a need to visit a store." — [[Shields#System Upgrades]]
    // > "2 100*/125** Ftlgame-scrap.png 1 layer" — [[Shields#System Upgrades]]
    // > "3 20 Ftlgame-scrap.png" — [[Shields#System Upgrades]]
    // > "4 30 Ftlgame-scrap.png 2 layers" — [[Shields#System Upgrades]]
    // > "5 40 Ftlgame-scrap.png" — [[Shields#System Upgrades]]
    // > "6 60 Ftlgame-scrap.png 3 layers" — [[Shields#System Upgrades]]
    // > "7 80 Ftlgame-scrap.png" — [[Shields#System Upgrades]]
    // > "8 100 Ftlgame-scrap.png 4 layers" — [[Shields#System Upgrades]]
    // > "Level Cost Evasion 1 - 5% 2 10 Ftlgame-scrap.png 10% 3 15 Ftlgame-scrap.png 15% 4 30 Ftlgame-scrap.png 20% 5 40 Ftlgame-scrap.png 25% 6 60 Ftlgame-scrap.png 28% 7 80 Ftlgame-scrap.png 31% 8 120 Ftlgame-scrap.png 35%" — [[Engines#System Upgrades]]
    // > "2 25 Ftlgame-scrap.png 4.8%/sec" — [[Oxygen#System Upgrades]]
    // > "3 50 Ftlgame-scrap.png 8.4%/sec" — [[Oxygen#System Upgrades]]
    // > "2 35 Ftlgame-scrap.png 9.6 HP/sec Crew can heal in an airless Medbay" — [[Medbay#System Upgrades]]
    // > "3 45 Ftlgame-scrap.png 19.2 HP/sec" — [[Medbay#System Upgrades]]
    // > "Level Cost Power 1 - 1 2 40 Ftlgame-scrap.png 2 3 25 Ftlgame-scrap.png 3 4 35 Ftlgame-scrap.png 4 5 50 Ftlgame-scrap.png 5 6 75 Ftlgame-scrap.png 6 7 90 Ftlgame-scrap.png 7 8 100 Ftlgame-scrap.png 8" — [[Weapon Control#System Upgrades]]
    // > "Level Cost Evasion % of the total available Engines evasion with crew without crew 1 - 100% 0% 2 20 Ftlgame-scrap.png 100% 50% 3 50 Ftlgame-scrap.png 100% 80%" — [[Piloting#System Upgrades]]
    // > "2 25 Ftlgame-scrap.png See interior of all rooms on your and enemy ship" — [[Sensors#System Upgrades]]
    // > "3 40 Ftlgame-scrap.png See interior of all rooms on your and enemy ship, see enemy weapons charge" — [[Sensors#System Upgrades]]
    // > "4 N/A* (Additionally) See enemy systems level, power usage, ion damage, cooldown, repair and sabotage progress" — [[Sensors#System Upgrades]]
    // > "Only available when Level 3 Sensors subsystem is manned." — [[Sensors#System Upgrades]]
    // > "1 60* Ftlgame-scrap.png Normal Doors Remote opening/closing of doors" — [[Door System#System Upgrades]]
    // > "2 35 Ftlgame-scrap.png Blast Doors Significantly slows down fires spread between rooms, impedes boarders movement" — [[Door System#System Upgrades]]
    // > "3 50 Ftlgame-scrap.png Improved Blast Doors Significantly slows down fires spread between rooms, impedes boarders movement more" — [[Door System#System Upgrades]]
    // > "The reactor can hold a maximum of 25 power bars." — [[Ship#Reactor power]]
    // > "In order to fully upgrade a ship with 8 power, it costs 490 Ftlgame-scrap.png." — [[Ship#Reactor power]]
    // > "reactor power bars from 3 to 5 cost 30 scrap each" — [[Systems]]
    assert.equal(allTunes().length, 15);
    for (const tune of allTunes()) {
      assert.equal(tuneDef(tune.id)?.start, tune.start);
      for (const step of tune.costs)
        assert.equal(upgradeCost(tune.id as SysId, step.level), step.cost);
    }
    assert.equal(tuneDef("shields")?.start, 2);
    assert.equal(tuneDef("shields")?.costs.find((step) => step.level === 1)?.cost, 100);
    assert.equal(tuneDef("engines")?.costs.find((step) => step.level === 1)?.cost, 10);
    assert.equal(upgradeCost("sensors", 3), null);
    assert.equal(upgradeCost("doors", 0), 60);
    assert.equal(upgradeCost("reactor", 8), 20);
    assert.equal(upgradeCost("reactor", 25), null);
  });

  it("spends the packed shields step and leaves the authored row", () => {
    assert.equal(tuneDef("shields")?.costs.find((step) => step.level === 1)?.cost, 100);
    const shields = tuneDef("shields");
    assert.ok(shields);
    loadPack(
      {
        tunes: [
          {
            ...shields,
            costs: shields.costs.map((step) =>
              step.level === 1 ? { ...step, cost: 7 } : { ...step },
            ),
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
    resetPackForTests();
    assert.equal(tuneDef("shields")?.costs.find((step) => step.level === 1)?.cost, 100);
  });

  it("installs shields at the packed start", () => {
    // Wiki citations:
    // > "Stealth Cruisers start without Shields system, and can buy one at a store for 125 scrap. This gives them Shields-2." — [[Shields#System Upgrades]]
    assert.equal(tuneDef("shields")?.start, 2);
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
    resetPackForTests();
    assert.equal(tuneDef("shields")?.start, 2);
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

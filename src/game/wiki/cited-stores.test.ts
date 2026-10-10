import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BUNDLE_OTHER, BUNDLE_PATCH } from "../extras/swarm.ts";
import { buy, commitJump, createGame, openStoreHere, startCombat, step } from "../sim.ts";
import type { Game, Kit, KitId, StockItem, WeaponInst } from "../types.ts";
import {
  CITED_DRONES,
  CRYSTAL_SECTOR_WEAPONS,
  citedSell,
  citedSellQuote,
  citedStock,
  storeSections,
  type StoreSection,
} from "./cited-stores.ts";

/**
 * Steps g.seed by 39 until `ok` holds. That keeps the Drone Control bundle (g.seed % 3) and the drone window
 * (g.seed % 13), so only the rolled sections and systems change.
 */
function reseed(g: Game, ok: (g: Game) => boolean): Game {
  for (let i = 0; i < 3000; i++, g.seed += 39) if (ok(g)) return g;
  assert.fail("no seed rolls that store");
}

function rolls(...want: StoreSection[]) {
  return (g: Game) => want.every((kind) => storeSections(g).includes(kind));
}

function openStore(seed: number, prep?: (g: Game) => void, ok?: (stock: StockItem[]) => boolean) {
  const g = createGame(seed);
  prep?.(g);
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here);
  const dest = g.beacons.find((b) => b.id !== g.here);
  assert.ok(dest);
  dest.kind = "store";
  dest.resolved = false;
  if (!here.links.includes(dest.id)) here.links.push(dest.id);
  g.fuel = 5;
  commitJump(g, dest.id);
  assert.equal(g.phase, "store");
  if (ok) {
    reseed(g, (x) => {
      openStoreHere(x);
      return ok(x.stock ?? []);
    });
  }
  return g;
}

function mount(defId: string, uid = defId): WeaponInst {
  return { uid, defId, charge: 0, enabled: false, autofire: false, target: null };
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

function kinds(g: Game) {
  return [...new Set(citedStock(g).map((item) => item.kind))];
}

describe("cited stores", () => {
  it("offers missing shields at 125 and spends that scrap once", () => {
    const g = openStore(4, (game) => {
      game.player.systems.shields.level = 0;
      game.player.systems.shields.power = 2;
    }, (stock) => stock.some((item) => item.kind === "drone") && stock.some((item) => item.kind === "system"));
    const fuel = g.stock?.find((item) => item.kind === "fuel");
    const missiles = g.stock?.find((item) => item.kind === "missiles");
    const parts = g.stock?.find((item) => item.kind === "parts");
    assert.ok(fuel && missiles && parts);

    const shields = g.stock?.find((item) => item.kind === "system" && item.ref === "shields");
    assert.ok(shields);
    assert.equal(shields.cost, 125);
    assert.equal(
      g.stock?.some((item) => item.name === "Drone Control" || item.ref === "swarm"),
      true,
    );
    assert.equal(
      g.stock?.some((item) => item.kind === "drone"),
      true,
    );

    g.scrap = shields.cost;
    buy(g, shields.id);
    // The Stealth Cruiser: two power bars making one shield layer. Power stays unassigned.
    assert.equal(g.player.systems.shields.level, 2);
    assert.equal(g.player.systems.shields.power, 0);
    assert.equal(g.player.shieldNow, 0);
    assert.equal(g.scrap, 0);
    assert.equal(
      g.stock?.some((item) => item.id === shields.id),
      false,
    );
  });

  it("does not offer shields that are already installed, and offers the other medical system only at random", () => {
    const g = openStore(5, undefined, (stock) => stock.some((item) => item.ref === "cradle"));
    assert.ok(g.player.systems.shields.level > 0);
    assert.equal(
      g.stock?.some((item) => item.ref === "shields"),
      false,
    );
    const bay = g.stock?.find((item) => item.ref === "cradle");
    assert.ok(bay);
    assert.equal(bay.cost, 50);
    assert.equal(
      g.stock?.some((item) => item.ref === "medbay"),
      false,
    );
  });

  it("guarantees a Clone Bay, not a Medbay, to a ship with neither, and fits it at level 1", () => {
    // xftl doc/stores: "Medbay (or Clonebay in AE) if you have neither", and the random list skips medical systems.
    const g = openStore(6, (game) => {
      game.player.systems.medbay.level = 0;
      game.player.systems.medbay.power = 1;
    }, (stock) => stock.some((item) => item.kind === "system"));
    assert.equal(
      g.stock?.some((item) => item.ref === "medbay"),
      false,
    );
    const bay = g.stock?.find((item) => item.kind === "system" && item.ref === "cradle");
    assert.ok(bay);
    assert.equal(bay.cost, 50);
    g.scrap = 50;
    buy(g, bay.id);
    assert.equal(g.player.kits.cradle?.level, 1);
    assert.equal(g.player.kits.cradle?.power, 0);
    assert.equal(g.scrap, 0);
  });

  it("lists the other priced systems only while missing, and not artillery", () => {
    const g = openStore(7, (game) => {
      game.player.systems.shields.level = 0;
      game.player.systems.medbay.level = 0;
      game.player.systems.sensors.level = 0;
      game.player.systems.doors.level = 0;
      game.player.systems.engines.level = 0;
      game.player.systems.oxygen.level = 0;
      game.player.systems.weapons.level = 0;
      game.player.systems.pilot.level = 0;
      game.player.kits = {};
    }, (stock) => stock.some((item) => item.kind === "system") && !stock.some((item) => item.kind === "drone"));
    const systems = (g.stock ?? []).filter((item) => item.kind === "system");
    const byName = Object.fromEntries(systems.map((item) => [item.name, item.cost]));
    // Shields and the Clone Bay are guaranteed. The third is a random missing non-medical system.
    assert.equal(systems.length, 3);
    assert.equal(byName.Shields, 125);
    assert.equal(byName["Clone Bay"], 50);
    assert.equal(byName.Medbay, undefined);
    assert.equal(systems.some((item) => item.ref === "engines" || item.ref === "lance" || item.ref === "flak"), false);

    g.scrap = 50;
    const bay = systems.find((item) => item.name === "Clone Bay");
    assert.ok(bay);
    buy(g, bay.id);
    assert.equal(g.player.kits.cradle?.level, 1);
    assert.equal(g.player.kits.cradle?.power, 0);
    assert.equal(g.player.systems.medbay.level, 0);
    assert.equal(g.scrap, 0);
    assert.equal(g.player.kits.swarm, undefined);
  });

  it("buys one catalog augment and one priced crew member without charging twice", () => {
    const g = createGame(8);
    ownEveryPricedSystem(g);
    reseed(g, rolls("augments", "crew"));
    const seed = g.seed;
    const stock = citedStock(g);
    assert.equal(g.seed, seed);
    g.stock = stock;
    const augment = stock.find((item) => item.kind === "augment" && item.ref === "feed");
    const human = stock.find((item) => item.kind === "crew" && item.ref === "plain");
    assert.ok(augment && human);
    assert.equal(augment.cost, 40);
    assert.equal(human.cost, 45);
    assert.equal(
      stock.some((item) => item.ref === "keel" || item.ref === "casing"),
      false,
    );
    const crewBefore = g.crew.filter((c) => c.side === "player").length;
    g.scrap = 40;
    buy(g, augment.id);
    assert.deepEqual(g.augments, ["feed"]);
    assert.equal(g.scrap, 0);
    g.scrap = 45;
    buy(g, human.id);
    assert.equal(g.scrap, 0);
    const hired = g.crew.filter((c) => c.side === "player" && c.kin === "plain");
    assert.equal(g.crew.filter((c) => c.side === "player").length, crewBefore + 1);
    assert.ok(hired.some((c) => c.maxHp === 100));
  });

  it("keeps each printed system price when that system is the one in the slot", () => {
    const rows: { ref: string; name: string; cost: number; slot: "sys" | "kit" }[] = [
      { ref: "shields", name: "Shields", cost: 125, slot: "sys" },
      { ref: "medbay", name: "Medbay", cost: 50, slot: "sys" },
      { ref: "cradle", name: "Clone Bay", cost: 50, slot: "kit" },
      { ref: "sling", name: "Crew Teleporter", cost: 90, slot: "kit" },
      { ref: "veil", name: "Cloaking", cost: 150, slot: "kit" },
      { ref: "leash", name: "Mind Control", cost: 75, slot: "kit" },
      { ref: "spike", name: "Hacking", cost: 80, slot: "kit" },
      { ref: "sensors", name: "Sensors", cost: 40, slot: "sys" },
      { ref: "doors", name: "Door System", cost: 60, slot: "sys" },
      { ref: "cell", name: "Backup Battery", cost: 35, slot: "kit" },
    ];
    for (const row of rows) {
      const g = createGame(1);
      ownEveryPricedSystem(g);
      if (row.slot === "sys") g.player.systems[row.ref as "shields"].level = 0;
      else delete g.player.kits[row.ref as KitId];
      reseed(g, rolls("systems"));
      const hit = citedStock(g).find((item) => item.ref === row.ref);
      assert.ok(hit, row.ref);
      assert.equal(hit.name, row.name);
      assert.equal(hit.cost, row.cost);
      assert.equal(
        citedStock(g).some((item) => item.ref === "swarm" || item.name === "Drone Control"),
        false,
      );
    }
  });

  it("sells Drone Control at 75 with System Repair and at 85 with the other two schematics", () => {
    assert.equal(BUNDLE_PATCH, 75);
    assert.equal(BUNDLE_OTHER, 85);
    const cases = [
      { seed: 0, id: "sys-swarm-patch", detail: "System Repair Drone", cost: 75, target: "patch" },
      { seed: 1, id: "sys-swarm-ward", detail: "Defense Drone Mark I", cost: 85, target: "ward" },
      { seed: 2, id: "sys-swarm-striker", detail: "Combat Drone Mark I", cost: 85, target: "striker" },
      { seed: -1, id: "sys-swarm-striker", detail: "Combat Drone Mark I", cost: 85, target: "striker" },
    ];
    for (const row of cases) {
      const g = createGame(1);
      ownEveryPricedSystem(g);
      delete g.player.kits.swarm;
      g.seed = row.seed;
      // With a drones section Drone Control leaves the random list, and min(3, an empty list) sells no system.
      reseed(g, (x) => rolls("systems")(x) && !storeSections(x).includes("drones"));
      const seed = g.seed;
      const stock = citedStock(g);
      assert.equal(g.seed, seed);
      const item = stock.find((entry) => entry.ref === "swarm");
      assert.ok(item, String(row.seed));
      assert.equal(item.id, row.id);
      assert.equal(item.name, "Drone Control");
      assert.equal(item.cost, row.cost);
      assert.match(item.detail, new RegExp(row.detail));
      assert.equal(stock.filter((entry) => entry.kind === "drone").length, 0);
      g.stock = stock;
      g.scrap = row.cost - 1;
      buy(g, item.id);
      assert.equal(g.player.kits.swarm, undefined);
      g.scrap = row.cost;
      buy(g, item.id);
      assert.equal(g.scrap, 0);
      assert.equal(g.player.kits.swarm?.level, 2);
      assert.equal(g.player.kits.swarm?.power, 0);
      assert.equal(g.player.kits.swarm?.target, row.target);
      assert.equal(g.player.kits.swarm?.on, false);
      assert.equal(
        g.player.rooms.some((room) => room.kit === "swarm"),
        true,
      );
    }
    const owned = createGame(1);
    ownEveryPricedSystem(owned);
    reseed(owned, rolls("systems"));
    assert.equal(
      citedStock(owned).some((item) => item.ref === "swarm"),
      false,
    );
  });

  it("rolls 2 to 4 sections without duplicates, systems first half the time, and does not advance the seed", () => {
    const g = createGame(3);
    const counts = new Map<number, number>();
    let systemsFirst = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      g.seed = i * 7919 + 1;
      const seed = g.seed;
      const sections = storeSections(g);
      assert.equal(g.seed, seed);
      assert.deepEqual(storeSections(g), sections);
      assert.equal(new Set(sections).size, sections.length);
      counts.set(sections.length, (counts.get(sections.length) ?? 0) + 1);
      if (sections[0] === "systems") systemsFirst++;
    }
    assert.deepEqual([...counts.keys()].sort(), [2, 3, 4]);
    for (const n of [2, 3, 4]) assert.ok(Math.abs((counts.get(n) ?? 0) / N - 1 / 3) < 0.05, String(n));
    // 50% from the coin, plus a few rolled systems first after a miss.
    assert.ok(systemsFirst / N > 0.5 && systemsFirst / N < 0.65, String(systemsFirst / N));
    const items = citedStock(reseed(g, rolls("systems", "drones", "augments")));
    assert.equal(
      items.some((item) => item.kind === "weapon" || item.kind === "fuel"),
      false,
    );
  });

  it("swaps a drones section for weapons, augments, crew, or systems without Drone Control or a systems section", () => {
    const g = createGame(3);
    assert.equal(g.player.kits.swarm, undefined);
    for (let i = 0; i < 2000; i++) {
      g.seed = i * 104729 + 3;
      const sections = storeSections(g);
      if (!sections.includes("systems")) assert.equal(sections.includes("drones"), false, sections.join());
    }
    g.player.kits.swarm = kit("swarm", 2);
    reseed(g, (x) => storeSections(x).includes("drones") && !storeSections(x).includes("systems"));
  });

  it("sells min(3, random list) systems: a ship missing a medbay and two others gets two", () => {
    // xftl doc/stores, "Selecting systems", the closing example.
    const g = createGame(1);
    ownEveryPricedSystem(g);
    g.player.systems.medbay.level = 0;
    delete g.player.kits.cradle;
    g.player.systems.sensors.level = 0;
    g.player.systems.doors.level = 0;
    reseed(g, rolls("systems"));
    const systems = citedStock(g).filter((item) => item.kind === "system");
    assert.equal(systems.length, 2);
    assert.equal(systems[0].ref, "cradle");
    assert.ok(systems.slice(1).every((item) => item.ref === "sensors" || item.ref === "doors"));
  });

  it("sells no system when the only missing one is a forced Drone Control beside a drones section", () => {
    const g = createGame(1);
    ownEveryPricedSystem(g);
    delete g.player.kits.swarm;
    reseed(g, rolls("systems", "drones"));
    const stock = citedStock(g);
    assert.equal(
      stock.some((item) => item.kind === "system"),
      false,
    );
    assert.equal(stock.filter((item) => item.kind === "drone").length, 3);
  });

  it("returns fewer slots when fewer categories have anything to sell", () => {
    const g = createGame(1);
    ownEveryPricedSystem(g);
    g.augments = ["feed", "echo", "quiet"];
    while (g.crew.filter((c) => c.side === "player").length < 8) {
      const n = g.crew.length;
      g.crew.push({
        id: `pad-${n}`,
        name: "Pad",
        side: "player",
        aboard: "player",
        hp: 100,
        maxHp: 100,
        room: g.player.rooms[0].id,
        path: [],
        move: 0,
        think: 0,
        tone: 0,
      });
    }
    reseed(g, rolls("drones", "crew", "augments", "systems"));
    assert.deepEqual(
      citedStock(g).map((item) => item.kind),
      ["drone", "drone", "drone"],
    );
    g.crew.pop();
    assert.deepEqual(
      citedStock(g)
        .map((item) => item.kind)
        .sort(),
      ["crew", "drone", "drone", "drone"],
    );
  });

  it("replaces medbay with a clone bay and keeps the level, without a new room or power bar", () => {
    const g = openStore(11, (game) => {
      game.player.systems.medbay.level = 3;
      game.player.systems.medbay.power = 2;
    }, (stock) => stock.some((item) => item.ref === "cradle"));
    const rooms = g.player.rooms.length;
    const reactor = g.player.reactor;
    const bay = g.stock?.find((item) => item.ref === "cradle");
    assert.ok(bay);
    assert.equal(bay.cost, 50);
    g.scrap = 50;
    buy(g, bay.id);
    assert.equal(g.player.systems.medbay.level, 0);
    assert.equal(g.player.systems.medbay.power, 0);
    assert.equal(g.player.kits.cradle?.level, 3);
    assert.equal(g.player.kits.cradle?.power, 0);
    assert.equal(g.scrap, 0);
    assert.equal(g.player.rooms.length, rooms);
    assert.equal(g.player.reactor, reactor);
  });

  it("replaces a clone bay with a medbay and keeps the level", () => {
    const g = openStore(12, (game) => {
      game.player.systems.medbay.level = 0;
      game.player.systems.medbay.power = 1;
      game.player.kits.cradle = kit("cradle", 4);
      game.player.kits.cradle.power = 2;
    }, (stock) => stock.some((item) => item.ref === "medbay"));
    const medbay = g.stock?.find((item) => item.ref === "medbay");
    assert.ok(medbay);
    assert.equal(medbay.cost, 50);
    g.scrap = 50;
    buy(g, medbay.id);
    assert.equal(g.player.kits.cradle, undefined);
    assert.equal(g.player.systems.medbay.level, 4);
    assert.equal(g.player.systems.medbay.power, 0);
    assert.equal(g.scrap, 0);
  });

  it("sells weapons and augments for half, or for the printed sell line, and does not subtract", () => {
    const g = createGame(1);
    const collected = g.scrapCollected;
    g.player.weapons = [
      mount("lineburst", "w-line"),
      mount("spark"),
      mount("dart"),
      mount("scatter"),
      mount("artemis"),
      mount("bossion"),
      mount("artemisEnemy"),
    ];
    g.augments = ["feed", "keel", "casing", "medbot"];
    g.player.zoltan = 5;
    const byRef = Object.fromEntries(citedSellQuote(g).map((quote) => [quote.ref, quote.scrap]));
    assert.equal(byRef.lineburst, 40);
    assert.equal(byRef.spark, 10);
    assert.equal(byRef.scatter, 32);
    assert.equal(byRef.artemis, 19);
    assert.equal(byRef.feed, 20);
    assert.equal(byRef.medbot, 30);
    assert.equal(byRef.dart, undefined);
    assert.equal(byRef.bossion, undefined);
    assert.equal(byRef.artemisEnemy, undefined);
    assert.equal(byRef.keel, undefined);
    assert.equal(byRef.casing, undefined);
    assert.equal(
      citedSellQuote(g).some((quote) => quote.kind !== "weapon" && quote.kind !== "augment"),
      false,
    );
    assert.equal(
      citedSellQuote(g).some((quote) => quote.name === "Drone Control" || quote.ref === "swarm"),
      false,
    );

    const before = g.scrap;
    const line = citedSellQuote(g).find((quote) => quote.ref === "lineburst");
    assert.ok(line);
    assert.equal(citedSell(g, line.id), true);
    assert.equal(g.scrap, before + 40);
    assert.equal(g.scrapCollected, (collected ?? 0) + 40);
    assert.equal(
      g.player.weapons.some((weapon) => weapon.uid === "w-line"),
      false,
    );
    assert.equal(g.armed, null);
    assert.equal(citedSell(g, line.id), false);
    assert.equal(g.scrap, before + 40);
    assert.equal(citedSell(g, "fuel"), false);
  });

  it("sells one copy of a repeated augment and uses the other printed sell prices", () => {
    const g = createGame(1);
    g.player.weapons = [
      mount("twin"),
      mount("heavypierce"),
      mount("chargers"),
      mount("mini"),
      mount("breach1"),
      mount("advflak"),
      mount("leto"),
      mount("bossmissile"),
    ];
    g.augments = ["feed", "feed", "pheromone", "gel"];
    const scrap = Object.fromEntries(citedSellQuote(g).filter((quote) => quote.kind === "weapon").map((quote) => [quote.ref, quote.scrap]));
    assert.deepEqual(scrap, {
      twin: 12,
      heavypierce: 27,
      chargers: 15,
      mini: 10,
      breach1: 25,
      advflak: 30,
      leto: 10,
    });
    const augments = citedSellQuote(g).filter((quote) => quote.kind === "augment");
    assert.deepEqual(
      augments.map((quote) => quote.scrap),
      [20, 20, 25, 30],
    );
    const before = g.scrap;
    assert.equal(citedSell(g, augments[0].id), true);
    assert.deepEqual(g.augments, ["feed", "pheromone", "gel"]);
    assert.equal(g.scrap, before + 20);
  });

  it("stocks three single-price schematics when Drone Control is fitted", () => {
    assert.equal(
      CITED_DRONES.some((row) => row.name === "Anti-Ship Fire Drone" || row.name === "Fire Drone"),
      false,
    );
    assert.equal(
      CITED_DRONES.some((row) => row.name === "Shield Overcharger +"),
      false,
    );
    assert.equal(
      CITED_DRONES.some((row) => row.name === "Drone Control" || row.ref === "swarm"),
      false,
    );
    assert.deepEqual(
      CITED_DRONES.map((row) => [row.name, row.cost]),
      [
        ["Combat Drone Mark I", 50],
        ["Combat Drone Mark II", 75],
        ["Anti-Ship Beam Drone I", 50],
        ["Anti-Ship Beam Drone II", 60],
        ["Defense Drone Mark I", 50],
        ["Defense Drone Mark II", 70],
        ["Anti-Combat Drone", 35],
        ["Shield Overcharger", 60],
        ["Anti-Personnel Drone", 35],
        ["System Repair Drone", 30],
        ["Hull Repair Drone", 85],
        ["Boarding Drone", 70],
        ["Ion Intruder Drone", 65],
      ],
    );
    const windowOf = (seed: number) => {
      const g = createGame(1);
      ownEveryPricedSystem(g);
      g.seed = seed;
      reseed(g, rolls("drones"));
      const at = g.seed;
      const drones = citedStock(g).filter((item) => item.kind === "drone");
      assert.equal(g.seed, at);
      return drones.map((item) => [item.ref, item.cost, item.name]);
    };
    assert.deepEqual(windowOf(2), [
      ["beam", 50, "Anti-Ship Beam Drone I"],
      ["beam2", 60, "Anti-Ship Beam Drone II"],
      ["ward", 50, "Defense Drone Mark I"],
    ]);
    assert.deepEqual(windowOf(7), [
      ["overcharger", 60, "Shield Overcharger"],
      ["antipersonnel", 35, "Anti-Personnel Drone"],
      ["patch", 30, "System Repair Drone"],
    ]);
    assert.deepEqual(windowOf(10), [
      ["hull", 85, "Hull Repair Drone"],
      ["board", 70, "Boarding Drone"],
      ["ionintruder", 65, "Ion Intruder Drone"],
    ]);
    assert.deepEqual(windowOf(-3), windowOf(10));
    const bare = createGame(1);
    bare.seed = 2;
    // Without Drone Control a drones section survives only beside a systems section, which then guarantees it.
    reseed(bare, rolls("drones", "systems"));
    assert.deepEqual(
      citedStock(bare)
        .filter((item) => item.kind === "drone")
        .map((item) => [item.ref, item.cost]),
      [
        ["beam", 50],
        ["beam2", 60],
        ["ward", 50],
      ],
    );
    const control = citedStock(bare).find((item) => item.ref === "swarm");
    assert.ok(control);
    assert.equal(control.cost, 85);
    bare.scrap = 50;
    bare.stock = citedStock(bare);
    const beam = bare.stock.find((item) => item.ref === "beam");
    assert.ok(beam);
    buy(bare, beam.id);
    assert.equal(bare.scrap, 50);
    assert.equal(bare.player.kits.swarm, undefined);
    const fitted = createGame(1);
    fitted.player.kits.swarm = kit("swarm", 2);
    fitted.seed = 2;
    reseed(fitted, rolls("drones"));
    assert.equal(
      citedSellQuote(fitted).some((quote) => quote.kind === "weapon" && quote.ref === "swarm"),
      false,
    );
    assert.equal(
      citedStock(fitted).some((item) => item.ref === "overchargerplus" || item.ref === "firedrone"),
      false,
    );
  });

  it("fits a bought schematic in a free slot and does not spend when the fit fails", () => {
    const g = createGame(1);
    ownEveryPricedSystem(g);
    const swarm = g.player.kits.swarm;
    assert.ok(swarm);
    swarm.target = null;
    g.seed = 2;
    g.stock = citedStock(g);
    const beam = g.stock.find((item) => item.ref === "beam");
    const beam2 = g.stock.find((item) => item.ref === "beam2");
    const ward = g.stock.find((item) => item.ref === "ward");
    assert.ok(beam && beam2 && ward);
    g.scrap = 50;
    buy(g, beam.id);
    assert.equal(g.scrap, 0);
    assert.equal(swarm.target, "beam");
    assert.equal(swarm.loadout, undefined);
    g.scrap = 60;
    buy(g, beam2.id);
    assert.equal(g.scrap, 0);
    assert.deepEqual(swarm.loadout, ["beam", "beam2"]);
    assert.equal(swarm.target, "beam");
    g.scrap = 50;
    buy(g, ward.id);
    assert.equal(g.scrap, 50);
    assert.deepEqual(swarm.loadout, ["beam", "beam2"]);

    const bare = createGame(3);
    bare.scrap = 85;
    bare.stock = [
      {
        id: "drone-hull",
        kind: "drone",
        ref: "hull",
        name: "Hull Repair Drone",
        detail: "",
        cost: 85,
        amount: 1,
      },
    ];
    buy(bare, "drone-hull");
    assert.equal(bare.scrap, 85);
    assert.equal(bare.player.kits.swarm, undefined);

    g.stock = [beam];
    g.scrap = 50;
    buy(g, beam.id);
    assert.equal(g.scrap, 50);
    assert.deepEqual(swarm.loadout, ["beam", "beam2"]);

    const engi = createGame(4);
    engi.hullId = "engi-a";
    engi.player.kits.swarm = kit("swarm", 3);
    engi.player.kits.swarm.target = "striker";
    engi.stock = [
      { id: "d-beam", kind: "drone", ref: "beam", name: "Anti-Ship Beam Drone I", detail: "", cost: 50, amount: 1 },
      { id: "d-hull", kind: "drone", ref: "hull", name: "Hull Repair Drone", detail: "", cost: 85, amount: 1 },
      { id: "d-board", kind: "drone", ref: "board", name: "Boarding Drone", detail: "", cost: 70, amount: 1 },
    ];
    engi.scrap = 205;
    buy(engi, "d-beam");
    buy(engi, "d-hull");
    assert.equal(engi.scrap, 70);
    assert.deepEqual(engi.player.kits.swarm?.loadout, ["striker", "beam", "hull"]);
    buy(engi, "d-board");
    assert.equal(engi.scrap, 70);
    assert.deepEqual(engi.player.kits.swarm?.loadout, ["striker", "beam", "hull"]);

    const vortex = createGame(5);
    vortex.hullId = "engi-b";
    vortex.player.kits.swarm = kit("swarm", 3);
    vortex.player.kits.swarm.loadout = ["patch", "patch"];
    vortex.stock = [
      { id: "d-hull", kind: "drone", ref: "hull", name: "Hull Repair Drone", detail: "", cost: 85, amount: 1 },
    ];
    vortex.scrap = 85;
    buy(vortex, "d-hull");
    assert.equal(vortex.scrap, 85);
    assert.deepEqual(vortex.player.kits.swarm?.loadout, ["patch", "patch"]);
  });

  it("sells a fitted Zoltan Shield for 40 and does not let the next jump refill it", () => {
    const g = createGame(1, "zoltan-a");
    assert.ok(g.augments.includes("zshield"));
    g.player.zoltan = 0;
    g.player.zoltanOver = true;
    const before = g.scrap;
    const quote = citedSellQuote(g).find((row) => row.ref === "zshield");
    assert.ok(quote);
    assert.equal(quote.kind, "augment");
    assert.equal(quote.scrap, 40);
    assert.equal(quote.name, "Zoltan Shield");
    assert.equal(citedSell(g, quote.id), true);
    assert.equal(g.scrap, before + 40);
    assert.equal(g.augments.includes("zshield"), false);
    assert.equal(g.player.zoltan, undefined);
    assert.equal(g.player.zoltanOver, undefined);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    g.fuel = 3;
    commitJump(g, here.links[0]);
    assert.equal(g.player.zoltan, undefined);
    assert.equal(createGame(1, "kestrel-a").augments.includes("zshield"), false);
  });
});

describe("Hidden Crystal Worlds stock", () => {
  const allowed = new Set<string>(CRYSTAL_SECTOR_WEAPONS);

  it("sells two crystal weapons and only a Crystal crewmember", () => {
    const g = openStore(8, (game) => {
      game.sectorName = "Hidden Crystal Worlds";
      ownEveryPricedSystem(game);
      game.augments = ["feed", "echo", "quiet"];
    }, (stock) => stock.some((item) => item.kind === "weapon") && stock.some((item) => item.kind === "crew"));
    const guns = (g.stock ?? []).filter((item) => item.kind === "weapon");
    assert.deepEqual(
      guns.map((item) => item.ref),
      ["crystalburst", "crystalburst2"],
    );
    const crew = (g.stock ?? []).filter((item) => item.kind === "crew");
    assert.deepEqual(
      crew.map((item) => item.ref),
      ["shard"],
    );
    g.scrap = crew[0].cost;
    buy(g, crew[0].id);
    assert.equal(
      g.crew.some((c) => c.side === "player" && c.kin === "shard"),
      true,
    );
    for (const gun of guns) assert.ok(allowed.has(gun.ref));
  });

  it("gives a crystal weapon for a crew kill, and can still give another gun for a hull kill", () => {
    const fromCrew = new Set<string>();
    const fromHull = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) {
      for (const mode of ["crew", "hull"] as const) {
        const g = createGame(seed);
        g.sectorName = "Hidden Crystal Worlds";
        g.player.weapons = [];
        startCombat(g, "scout");
        assert.ok(g.enemy);
        g.enemy.automated = false;
        g.enemy.classId = g.enemy.classId || "cited";
        if (g.enemy.kits.cradle) g.enemy.kits.cradle.level = 0;
        if (mode === "crew") {
          for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
        } else {
          g.enemy.hull = 0;
        }
        step(g, 0);
        if (g.phase !== "reward") continue;
        for (const w of g.player.weapons) (mode === "crew" ? fromCrew : fromHull).add(w.defId);
      }
    }
    assert.ok(fromCrew.size > 0);
    for (const id of fromCrew) assert.ok(allowed.has(id), id);
    assert.ok([...fromHull].some((id) => !allowed.has(id)));
  });
});

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
  droneSlotCap,
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
  g.player.kits.clonebay = kit("clonebay");
  g.player.kits.teleporter = kit("teleporter");
  g.player.kits.cloaking = kit("cloaking");
  g.player.kits.mind = kit("mind");
  g.player.kits.hacking = kit("hacking");
  g.player.kits.battery = kit("battery");
  g.player.kits.drones = kit("drones", 2);
}

function kinds(g: Game) {
  return [...new Set(citedStock(g).map((item) => item.kind))];
}

describe("cited stores", () => {
  it("offers missing shields at 125 and spends that scrap once", () => {
    const g = openStore(
      4,
      (game) => {
        game.player.systems.shields.level = 0;
        game.player.systems.shields.power = 2;
      },
      (stock) =>
        stock.some((item) => item.kind === "drone") && stock.some((item) => item.kind === "system"),
    );
    const fuel = g.stock?.find((item) => item.kind === "fuel");
    const missiles = g.stock?.find((item) => item.kind === "missiles");
    const parts = g.stock?.find((item) => item.kind === "parts");
    assert.ok(fuel && missiles && parts);

    const shields = g.stock?.find((item) => item.kind === "system" && item.ref === "shields");
    assert.ok(shields);
    assert.equal(shields.cost, 125);
    assert.equal(
      g.stock?.some((item) => item.name === "Drone Control" || item.ref === "drones"),
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
    const g = openStore(5, undefined, (stock) => stock.some((item) => item.ref === "clonebay"));
    assert.ok(g.player.systems.shields.level > 0);
    assert.equal(
      g.stock?.some((item) => item.ref === "shields"),
      false,
    );
    const bay = g.stock?.find((item) => item.ref === "clonebay");
    assert.ok(bay);
    assert.equal(bay.cost, 50);
    assert.equal(
      g.stock?.some((item) => item.ref === "medbay"),
      false,
    );
  });

  it("guarantees one medical system, a Medbay or a Clone Bay, to a ship with neither (Stores and resources)", () => {
    // "A medical system is guaranteed if you don't have one."
    const seen = new Set<string>();
    for (const seed of [6, 16, 26, 36, 46, 56]) {
      const g = openStore(
        seed,
        (game) => {
          game.player.systems.medbay.level = 0;
          game.player.systems.medbay.power = 1;
        },
        (stock) => stock.some((item) => item.kind === "system"),
      );
      const medical = (g.stock ?? []).filter(
        (item) => item.ref === "medbay" || item.ref === "clonebay",
      );
      assert.equal(medical.length, 1);
      assert.equal(medical[0].cost, 50);
      seen.add(medical[0].ref);
      g.scrap = 50;
      buy(g, medical[0].id);
      if (medical[0].ref === "clonebay") assert.equal(g.player.kits.clonebay?.level, 1);
      else assert.equal(g.player.systems.medbay.level, 1);
      assert.equal(g.scrap, 0);
    }
    assert.deepEqual([...seen].sort(), ["clonebay", "medbay"]);
  });

  it("lists the other priced systems only while missing, and not artillery", () => {
    const g = openStore(
      7,
      (game) => {
        game.player.systems.shields.level = 0;
        game.player.systems.medbay.level = 0;
        game.player.systems.sensors.level = 0;
        game.player.systems.doors.level = 0;
        game.player.systems.oxygen.level = 0;
        game.player.systems.weapons.level = 0;
        game.player.kits = {};
      },
      (stock) =>
        stock.some((item) => item.kind === "system") &&
        !stock.some((item) => item.kind === "drone"),
    );
    // Piloting, "Overview": a jump needs a pilot and powered engines, so they come off after arriving.
    g.player.systems.engines.level = 0;
    g.player.systems.pilot.level = 0;
    assert.equal(
      citedStock(g).some((item) => item.kind === "system" && item.ref === "engines"),
      false,
    );
    const systems = (g.stock ?? []).filter((item) => item.kind === "system");
    const byName = Object.fromEntries(systems.map((item) => [item.name, item.cost]));
    // Shields and one medical system are guaranteed. The third is a random missing non-medical system.
    assert.equal(systems.length, 3);
    assert.equal(byName.Shields, 125);
    const medical = systems.filter((item) => item.ref === "medbay" || item.ref === "clonebay");
    assert.equal(medical.length, 1);
    assert.equal(medical[0].cost, 50);
    assert.equal(
      systems.some((item) => item.ref === "engines" || item.ref === "artillery"),
      false,
    );

    g.scrap = 50;
    buy(g, medical[0].id);
    assert.equal(g.scrap, 0);
    assert.equal(g.player.kits.drones, undefined);
  });

  it("buys one catalog augment and one priced crew member without charging twice", () => {
    const g = createGame(8);
    ownEveryPricedSystem(g);
    reseed(g, rolls("augments", "crew"));
    const seed = g.seed;
    const stock = citedStock(g);
    assert.equal(g.seed, seed);
    g.stock = stock;
    const augment = stock.find((item) => item.kind === "augment" && item.ref === "AUTO_COOLDOWN");
    const human = stock.find((item) => item.kind === "crew" && item.ref === "human");
    assert.ok(augment && human);
    assert.equal(augment.cost, 40);
    assert.equal(human.cost, 45);
    assert.equal(
      stock.some((item) => item.ref === "ROCK_ARMOR" || item.ref === "SYSTEM_CASING"),
      false,
    );
    const crewBefore = g.crew.filter((c) => c.side === "player").length;
    g.scrap = 40;
    buy(g, augment.id);
    assert.deepEqual(g.augments, ["AUTO_COOLDOWN"]);
    assert.equal(g.scrap, 0);
    g.scrap = 45;
    buy(g, human.id);
    assert.equal(g.scrap, 0);
    const hired = g.crew.filter((c) => c.side === "player" && c.kin === "human");
    assert.equal(g.crew.filter((c) => c.side === "player").length, crewBefore + 1);
    assert.ok(hired.some((c) => c.maxHp === 100));
  });

  it("keeps each printed system price when that system is the one in the slot", () => {
    const rows: { ref: string; name: string; cost: number; slot: "sys" | "kit" }[] = [
      { ref: "shields", name: "Shields", cost: 125, slot: "sys" },
      { ref: "medbay", name: "Medbay", cost: 50, slot: "sys" },
      { ref: "clonebay", name: "Clone Bay", cost: 50, slot: "kit" },
      { ref: "teleporter", name: "Crew Teleporter", cost: 90, slot: "kit" },
      { ref: "cloaking", name: "Cloaking", cost: 150, slot: "kit" },
      { ref: "mind", name: "Mind Control", cost: 75, slot: "kit" },
      { ref: "hacking", name: "Hacking", cost: 80, slot: "kit" },
      { ref: "sensors", name: "Sensors", cost: 40, slot: "sys" },
      { ref: "doors", name: "Door System", cost: 60, slot: "sys" },
      { ref: "battery", name: "Backup Battery", cost: 35, slot: "kit" },
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
        citedStock(g).some((item) => item.ref === "drones" || item.name === "Drone Control"),
        false,
      );
    }
  });

  it("sells Drone Control at 75 with System Repair and at 85 with the other two schematics", () => {
    assert.equal(BUNDLE_PATCH, 75);
    assert.equal(BUNDLE_OTHER, 85);
    const cases = [
      {
        seed: 0,
        id: "sys-drones-REPAIR",
        detail: "System Repair Drone",
        cost: 75,
        target: "REPAIR",
      },
      {
        seed: 1,
        id: "sys-drones-DEFENSE_1",
        detail: "Defense Drone Mark I",
        cost: 85,
        target: "DEFENSE_1",
      },
      {
        seed: 2,
        id: "sys-drones-COMBAT_1",
        detail: "Combat Drone Mark I",
        cost: 85,
        target: "COMBAT_1",
      },
      {
        seed: -1,
        id: "sys-drones-COMBAT_1",
        detail: "Combat Drone Mark I",
        cost: 85,
        target: "COMBAT_1",
      },
    ];
    for (const row of cases) {
      const g = createGame(1);
      ownEveryPricedSystem(g);
      delete g.player.kits.drones;
      g.seed = row.seed;
      // With a drones section Drone Control leaves the random list, and min(3, an empty list) sells no system.
      reseed(g, (x) => rolls("systems")(x) && !storeSections(x).includes("drones"));
      const seed = g.seed;
      const stock = citedStock(g);
      assert.equal(g.seed, seed);
      const item = stock.find((entry) => entry.ref === "drones");
      assert.ok(item, String(row.seed));
      assert.equal(item.id, row.id);
      assert.equal(item.name, "Drone Control");
      assert.equal(item.cost, row.cost);
      assert.match(item.detail, new RegExp(row.detail));
      assert.equal(stock.filter((entry) => entry.kind === "drone").length, 0);
      g.stock = stock;
      g.scrap = row.cost - 1;
      buy(g, item.id);
      assert.equal(g.player.kits.drones, undefined);
      g.scrap = row.cost;
      buy(g, item.id);
      assert.equal(g.scrap, 0);
      // Cast: the assert.equal(..., undefined) above narrows this path to undefined for TypeScript.
      const bay = g.player.kits.drones as Kit | undefined;
      assert.equal(bay?.level, 2);
      assert.equal(bay?.power, 0);
      assert.equal(bay?.target, row.target);
      assert.equal(bay?.on, false);
      assert.equal(
        g.player.rooms.some((room) => room.kit === "drones"),
        true,
      );
    }
    const owned = createGame(1);
    ownEveryPricedSystem(owned);
    reseed(owned, rolls("systems"));
    assert.equal(
      citedStock(owned).some((item) => item.ref === "drones"),
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
    for (const n of [2, 3, 4])
      assert.ok(Math.abs((counts.get(n) ?? 0) / N - 1 / 3) < 0.05, String(n));
    // 50% from the coin, plus a few rolled systems first after a miss.
    assert.ok(systemsFirst / N > 0.5 && systemsFirst / N < 0.65, String(systemsFirst / N));
    const items = citedStock(reseed(g, rolls("systems", "drones", "augments")));
    assert.equal(
      items.some((item) => item.kind === "weapon" || item.kind === "fuel"),
      false,
    );
  });

  it("forces systems first half the time only below 11 systems+subsystems (Stores and resources)", () => {
    const share = (g: Game) => {
      let first = 0;
      for (let i = 0; i < 2000; i++) {
        g.seed = i * 7919 + 1;
        if (storeSections(g)[0] === "systems") first += 1;
      }
      return first / 2000;
    };
    const small = createGame(3);
    const big = createGame(3);
    ownEveryPricedSystem(big);
    const count =
      Object.values(big.player.systems).filter((x) => x.level > 0).length +
      Object.keys(big.player.kits).length;
    assert.ok(count >= 11, String(count));
    // Below 11: the coin plus a random first pick (1 in 5). At 11 or more: only the random pick.
    assert.ok(share(small) > 0.5, String(share(small)));
    assert.ok(share(big) < 0.3, String(share(big)));
  });

  it("swaps a drones section for weapons, augments, crew, or systems without Drone Control or a systems section", () => {
    const g = createGame(3);
    assert.equal(g.player.kits.drones, undefined);
    for (let i = 0; i < 2000; i++) {
      g.seed = i * 104729 + 3;
      const sections = storeSections(g);
      if (!sections.includes("systems"))
        assert.equal(sections.includes("drones"), false, sections.join());
    }
    g.player.kits.drones = kit("drones", 2);
    reseed(g, (x) => storeSections(x).includes("drones") && !storeSections(x).includes("systems"));
  });

  it("sells min(3, random list) systems: a ship missing a medbay and two others gets two", () => {
    // xftl doc/stores, "Selecting systems", the closing example.
    const g = createGame(1);
    ownEveryPricedSystem(g);
    g.player.systems.medbay.level = 0;
    delete g.player.kits.clonebay;
    g.player.systems.sensors.level = 0;
    g.player.systems.doors.level = 0;
    reseed(g, rolls("systems"));
    const systems = citedStock(g).filter((item) => item.kind === "system");
    assert.equal(systems.length, 2);
    assert.ok(systems[0].ref === "clonebay" || systems[0].ref === "medbay");
    assert.ok(systems.slice(1).every((item) => item.ref === "sensors" || item.ref === "doors"));
  });

  it("sells no system when the only missing one is a forced Drone Control beside a drones section", () => {
    const g = createGame(1);
    ownEveryPricedSystem(g);
    delete g.player.kits.drones;
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
    g.augments = ["AUTO_COOLDOWN", "EXPLOSIVE_REPLICATOR", "CLOAK_FIRE"];
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
    // Crew: a full crew can still hire by relieving someone first, so the crew section stays.
    assert.deepEqual(
      citedStock(g).map((item) => item.kind),
      ["drone", "drone", "drone", "crew", "crew", "crew"],
    );
  });

  it("replaces medbay with a clone bay and keeps the level, without a new room or power bar", () => {
    const g = openStore(
      11,
      (game) => {
        game.player.systems.medbay.level = 3;
        game.player.systems.medbay.power = 2;
      },
      (stock) => stock.some((item) => item.ref === "clonebay"),
    );
    const rooms = g.player.rooms.length;
    const reactor = g.player.reactor;
    const bay = g.stock?.find((item) => item.ref === "clonebay");
    assert.ok(bay);
    assert.equal(bay.cost, 50);
    g.scrap = 50;
    buy(g, bay.id);
    assert.equal(g.player.systems.medbay.level, 0);
    assert.equal(g.player.systems.medbay.power, 0);
    assert.equal(g.player.kits.clonebay?.level, 3);
    assert.equal(g.player.kits.clonebay?.power, 0);
    assert.equal(g.scrap, 0);
    assert.equal(g.player.rooms.length, rooms);
    assert.equal(g.player.reactor, reactor);
  });

  it("replaces a clone bay with a medbay and keeps the level", () => {
    const g = openStore(
      12,
      (game) => {
        game.player.systems.medbay.level = 0;
        game.player.systems.medbay.power = 1;
        game.player.kits.clonebay = kit("clonebay", 4);
        game.player.kits.clonebay.power = 2;
      },
      (stock) => stock.some((item) => item.ref === "medbay"),
    );
    const medbay = g.stock?.find((item) => item.ref === "medbay");
    assert.ok(medbay);
    assert.equal(medbay.cost, 50);
    g.scrap = 50;
    buy(g, medbay.id);
    assert.equal(g.player.kits.clonebay, undefined);
    assert.equal(g.player.systems.medbay.level, 4);
    assert.equal(g.player.systems.medbay.power, 0);
    assert.equal(g.scrap, 0);
  });

  it("sells weapons and augments for half, or for the printed sell line, and does not subtract", () => {
    const g = createGame(1);
    const collected = g.scrapCollected;
    g.player.weapons = [
      mount("LASER_BURST_3", "w-line"),
      mount("LASER_BURST_1"),
      mount("dart"),
      mount("SHOTGUN"),
      mount("MISSILES_2_PLAYER"),
      mount("ARTILLERY_BOSS_4"),
      mount("MISSILES_2"),
    ];
    g.augments = ["AUTO_COOLDOWN", "ROCK_ARMOR", "SYSTEM_CASING", "NANO_MEDBAY"];
    g.player.zoltan = 5;
    const byRef = Object.fromEntries(citedSellQuote(g).map((quote) => [quote.ref, quote.scrap]));
    assert.equal(byRef.LASER_BURST_3, 40);
    assert.equal(byRef.LASER_BURST_1, 10);
    assert.equal(byRef.SHOTGUN, 32);
    assert.equal(byRef.MISSILES_2_PLAYER, 19);
    assert.equal(byRef.AUTO_COOLDOWN, 20);
    assert.equal(byRef.NANO_MEDBAY, 30);
    assert.equal(byRef.dart, undefined);
    assert.equal(byRef.ARTILLERY_BOSS_4, undefined);
    assert.equal(byRef.MISSILES_2, undefined);
    assert.equal(byRef.ROCK_ARMOR, undefined);
    assert.equal(byRef.SYSTEM_CASING, undefined);
    assert.equal(
      citedSellQuote(g).some((quote) => quote.kind !== "weapon" && quote.kind !== "augment"),
      false,
    );
    assert.equal(
      citedSellQuote(g).some((quote) => quote.name === "Drone Control" || quote.ref === "drones"),
      false,
    );

    const before = g.scrap;
    const line = citedSellQuote(g).find((quote) => quote.ref === "LASER_BURST_3");
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
      mount("LASER_BURST_2"),
      mount("LASER_HEAVY_1_SP"),
      mount("LASER_CHARGEGUN_PLAYER"),
      mount("BEAM_1"),
      mount("BOMB_BREACH_1"),
      mount("SHOTGUN_PLAYER"),
      mount("MISSILES_1"),
      mount("ARTILLERY_BOSS_2"),
    ];
    g.augments = ["AUTO_COOLDOWN", "AUTO_COOLDOWN", "CREW_STIMS", "SLUG_GEL"];
    const scrap = Object.fromEntries(
      citedSellQuote(g)
        .filter((quote) => quote.kind === "weapon")
        .map((quote) => [quote.ref, quote.scrap]),
    );
    assert.deepEqual(scrap, {
      LASER_BURST_2: 12,
      LASER_HEAVY_1_SP: 27,
      LASER_CHARGEGUN_PLAYER: 15,
      BEAM_1: 10,
      BOMB_BREACH_1: 25,
      SHOTGUN_PLAYER: 30,
      MISSILES_1: 10,
    });
    const augments = citedSellQuote(g).filter((quote) => quote.kind === "augment");
    assert.deepEqual(
      augments.map((quote) => quote.scrap),
      [20, 20, 25, 30],
    );
    const before = g.scrap;
    assert.equal(citedSell(g, augments[0].id), true);
    assert.deepEqual(g.augments, ["AUTO_COOLDOWN", "CREW_STIMS", "SLUG_GEL"]);
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
      CITED_DRONES.some((row) => row.name === "Drone Control" || row.ref === "drones"),
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
      ["COMBAT_BEAM", 50, "Anti-Ship Beam Drone I"],
      ["COMBAT_BEAM_2", 60, "Anti-Ship Beam Drone II"],
      ["DEFENSE_1", 50, "Defense Drone Mark I"],
    ]);
    assert.deepEqual(windowOf(7), [
      ["DRONE_SHIELD", 60, "Shield Overcharger"],
      ["BATTLE", 35, "Anti-Personnel Drone"],
      ["REPAIR", 30, "System Repair Drone"],
    ]);
    assert.deepEqual(windowOf(10), [
      ["SHIP_REPAIR", 85, "Hull Repair Drone"],
      ["BOARDER", 70, "Boarding Drone"],
      ["BOARDER_ION", 65, "Ion Intruder Drone"],
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
        ["COMBAT_BEAM", 50],
        ["COMBAT_BEAM_2", 60],
        ["DEFENSE_1", 50],
      ],
    );
    const control = citedStock(bare).find((item) => item.ref === "drones");
    assert.ok(control);
    assert.equal(control.cost, 85);
    bare.scrap = 50;
    bare.stock = citedStock(bare);
    const beam = bare.stock.find((item) => item.ref === "COMBAT_BEAM");
    assert.ok(beam);
    // Per the user: a schematic with nowhere to fit goes to the cargo hold (make-room.ts).
    buy(bare, beam.id);
    assert.equal(bare.scrap, 0);
    assert.equal(bare.player.kits.drones, undefined);
    assert.deepEqual(bare.cargo, [{ kind: "drone", id: "COMBAT_BEAM" }]);
    const fitted = createGame(1);
    fitted.player.kits.drones = kit("drones", 2);
    fitted.seed = 2;
    reseed(fitted, rolls("drones"));
    assert.equal(
      citedSellQuote(fitted).some((quote) => quote.kind === "weapon" && quote.ref === "drones"),
      false,
    );
    assert.equal(
      citedStock(fitted).some(
        (item) => item.ref === "DRONE_SHIELD_PLAYER" || item.ref === "firedrone",
      ),
      false,
    );
  });

  it("fits a bought schematic in a free slot, else stows it in cargo, and never buys one already held", () => {
    const g = createGame(1);
    ownEveryPricedSystem(g);
    const swarm = g.player.kits.drones;
    assert.ok(swarm);
    swarm.target = null;
    g.seed = 2;
    g.stock = citedStock(g);
    const beam = g.stock.find((item) => item.ref === "COMBAT_BEAM");
    const beam2 = g.stock.find((item) => item.ref === "COMBAT_BEAM_2");
    const ward = g.stock.find((item) => item.ref === "DEFENSE_1");
    assert.ok(beam && beam2 && ward);
    g.scrap = 50;
    buy(g, beam.id);
    assert.equal(g.scrap, 0);
    assert.equal(swarm.target, "COMBAT_BEAM");
    assert.equal(swarm.loadout, undefined);
    g.scrap = 60;
    buy(g, beam2.id);
    assert.equal(g.scrap, 0);
    assert.deepEqual(swarm.loadout, ["COMBAT_BEAM", "COMBAT_BEAM_2"]);
    assert.equal(swarm.target, "COMBAT_BEAM");
    // Per the user: with the schematic slots full it goes to cargo.
    g.scrap = 50;
    buy(g, ward.id);
    assert.equal(g.scrap, 0);
    assert.deepEqual(swarm.loadout, ["COMBAT_BEAM", "COMBAT_BEAM_2"]);
    assert.deepEqual(g.cargo, [{ kind: "drone", id: "DEFENSE_1" }]);

    const bare = createGame(3);
    bare.scrap = 85;
    bare.stock = [
      {
        id: "drone-hull",
        kind: "drone",
        ref: "SHIP_REPAIR",
        name: "Hull Repair Drone",
        detail: "",
        cost: 85,
        amount: 1,
      },
    ];
    buy(bare, "drone-hull");
    assert.equal(bare.scrap, 0);
    assert.equal(bare.player.kits.drones, undefined);
    assert.deepEqual(bare.cargo, [{ kind: "drone", id: "SHIP_REPAIR" }]);

    g.stock = [beam];
    g.scrap = 50;
    buy(g, beam.id);
    assert.equal(g.scrap, 50);
    assert.deepEqual(swarm.loadout, ["COMBAT_BEAM", "COMBAT_BEAM_2"]);

    const engi = createGame(4);
    engi.hullId = "PLAYER_SHIP_CIRCLE";
    engi.player.kits.drones = kit("drones", 3);
    engi.player.kits.drones.target = "COMBAT_1";
    engi.stock = [
      {
        id: "d-beam",
        kind: "drone",
        ref: "COMBAT_BEAM",
        name: "Anti-Ship Beam Drone I",
        detail: "",
        cost: 50,
        amount: 1,
      },
      {
        id: "d-hull",
        kind: "drone",
        ref: "SHIP_REPAIR",
        name: "Hull Repair Drone",
        detail: "",
        cost: 85,
        amount: 1,
      },
      {
        id: "d-board",
        kind: "drone",
        ref: "BOARDER",
        name: "Boarding Drone",
        detail: "",
        cost: 70,
        amount: 1,
      },
    ];
    engi.scrap = 205;
    buy(engi, "d-beam");
    buy(engi, "d-hull");
    assert.equal(engi.scrap, 70);
    assert.deepEqual(engi.player.kits.drones?.loadout, ["COMBAT_1", "COMBAT_BEAM", "SHIP_REPAIR"]);
    buy(engi, "d-board");
    assert.equal(engi.scrap, 0);
    assert.deepEqual(engi.player.kits.drones?.loadout, ["COMBAT_1", "COMBAT_BEAM", "SHIP_REPAIR"]);
    assert.deepEqual(engi.cargo, [{ kind: "drone", id: "BOARDER" }]);

    const vortex = createGame(5);
    vortex.hullId = "PLAYER_SHIP_CIRCLE_2";
    vortex.player.kits.drones = kit("drones", 3);
    vortex.player.kits.drones.loadout = ["REPAIR", "REPAIR"];
    vortex.stock = [
      {
        id: "d-hull",
        kind: "drone",
        ref: "SHIP_REPAIR",
        name: "Hull Repair Drone",
        detail: "",
        cost: 85,
        amount: 1,
      },
    ];
    vortex.scrap = 85;
    buy(vortex, "d-hull");
    assert.equal(vortex.scrap, 0);
    assert.deepEqual(vortex.player.kits.drones?.loadout, ["REPAIR", "REPAIR"]);
    assert.deepEqual(vortex.cargo, [{ kind: "drone", id: "SHIP_REPAIR" }]);
  });

  it("counts drone slots only when Drone Control is installed", () => {
    const kestrel = createGame(1, "PLAYER_SHIP_HARD");
    assert.equal(kestrel.player.kits.drones, undefined);
    assert.equal(droneSlotCap(kestrel), 0);
    kestrel.player.kits.drones = kit("drones", 2);
    assert.equal(droneSlotCap(kestrel), 2);

    const engi = createGame(1, "PLAYER_SHIP_CIRCLE");
    assert.equal(droneSlotCap(engi), 3);
    const stealth = createGame(1, "PLAYER_SHIP_STEALTH_3");
    assert.equal(droneSlotCap(stealth), 3);
    const nesasio = createGame(1, "PLAYER_SHIP_STEALTH");
    assert.equal(nesasio.player.kits.drones, undefined);
    assert.equal(droneSlotCap(nesasio), 0);
  });

  it("sells a fitted Zoltan Shield for 40 and does not let the next jump refill it", () => {
    const g = createGame(1, "PLAYER_SHIP_ENERGY");
    assert.ok(g.augments.includes("ENERGY_SHIELD"));
    g.player.zoltan = 0;
    g.player.zoltanOver = true;
    const before = g.scrap;
    const quote = citedSellQuote(g).find((row) => row.ref === "ENERGY_SHIELD");
    assert.ok(quote);
    assert.equal(quote.kind, "augment");
    assert.equal(quote.scrap, 40);
    assert.equal(quote.name, "Zoltan Shield");
    assert.equal(citedSell(g, quote.id), true);
    assert.equal(g.scrap, before + 40);
    assert.equal(g.augments.includes("ENERGY_SHIELD"), false);
    assert.equal(g.player.zoltan, undefined);
    assert.equal(g.player.zoltanOver, undefined);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    g.fuel = 3;
    commitJump(g, here.links[0]);
    assert.equal(g.player.zoltan, undefined);
    assert.equal(createGame(1, "PLAYER_SHIP_HARD").augments.includes("ENERGY_SHIELD"), false);
  });
});

describe("Hidden Crystal Worlds stock", () => {
  const allowed = new Set<string>(CRYSTAL_SECTOR_WEAPONS);

  it("sells two crystal weapons and only a Crystal crewmember", () => {
    const g = openStore(
      8,
      (game) => {
        game.sectorId = "CRYSTAL_HOME";
        game.sectorName = "Hidden Crystal Worlds";
        ownEveryPricedSystem(game);
        game.augments = ["AUTO_COOLDOWN", "EXPLOSIVE_REPLICATOR", "CLOAK_FIRE"];
      },
      (stock) =>
        stock.some((item) => item.kind === "weapon") && stock.some((item) => item.kind === "crew"),
    );
    const guns = (g.stock ?? []).filter((item) => item.kind === "weapon");
    assert.deepEqual(
      guns.map((item) => item.ref),
      ["CRYSTAL_BURST_1", "CRYSTAL_BURST_2"],
    );
    const crew = (g.stock ?? []).filter((item) => item.kind === "crew");
    assert.deepEqual(
      crew.map((item) => item.ref),
      ["crystal"],
    );
    g.scrap = crew[0].cost;
    buy(g, crew[0].id);
    assert.equal(
      g.crew.some((c) => c.side === "player" && c.kin === "crystal"),
      true,
    );
    for (const gun of guns) assert.ok(allowed.has(gun.ref));
  });

  it("gives a crystal weapon for a crew kill, and can still give another gun for a hull kill", () => {
    const fromCrew = new Set<string>();
    const fromHull = new Set<string>();
    for (let seed = 1; seed <= 1600; seed++) {
      for (const mode of ["crew", "hull"] as const) {
        const g = createGame(seed);
        g.sectorId = "CRYSTAL_HOME";
        g.sectorName = "Hidden Crystal Worlds";
        g.player.weapons = [];
        startCombat(g, "scout");
        assert.ok(g.enemy);
        g.enemy.automated = false;
        g.enemy.classId = g.enemy.classId || "cited";
        if (g.enemy.kits.clonebay) g.enemy.kits.clonebay.level = 0;
        if (mode === "crew") {
          for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
        } else {
          g.enemy.hull = 0;
        }
        step(g, 0);
        if (g.phase !== "reward") continue;
        const note = g.reward?.note ?? "";
        const lowResources = /Low fuel|Low missiles|Low drone part/.test(note);
        for (const w of g.player.weapons) {
          if (mode === "hull") fromHull.add(w.defId);
          else if (lowResources) fromCrew.add(w.defId);
        }
      }
    }
    // The 3% item on a standard crew kill is a crystal weapon. The 1-in-9 weapon row is not that filter.
    assert.ok(fromCrew.size > 0);
    for (const id of fromCrew) assert.ok(allowed.has(id), id);
    assert.ok([...fromHull].some((id) => !allowed.has(id)));
  });
});

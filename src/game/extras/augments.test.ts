import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { AugmentId, Kit, WeaponInst } from "../types.ts";
import {
  CATALOG,
  adjustScrapAmount,
  baffleHolds,
  casingHolds,
  coilRate,
  feedRate,
  installAugment,
  keelHolds,
  lungScale,
  onNewSector,
  primeWeapons,
  reveals,
  saveMissile,
  spoolRate,
  tickMedbot,
  tickSquall,
} from "./augments.ts";

/** Sold rows only. medbot, gel, pheromone, booster, and vengeance have no purchase price and are not in CATALOG. */
type CatalogId = Exclude<AugmentId, "medbot" | "gel" | "pheromone" | "booster" | "vengeance">;

const NAMES: Record<CatalogId, string> = {
  feed: "Automated Re-loader",
  echo: "Explosive Replicator",
  quiet: "Stealth Weapons",
  hot: "Weapon Pre-Igniter",
  weld: "Repair Arm",
  baffle: "Reverse Ion Field",
  coil: "Shield Charge Booster",
  spool: "FTL Recharge Booster",
  hook: "Scrap Recovery Arm",
  keel: "Rock Plating",
  casing: "Titanium System Casing",
  tap: "Battery Charger",
  lung: "Emergency Respirators",
  squall: "Fire Suppression",
  falsebuoy: "Distraction Buoys",
  glass: "Long-Ranged Scanners",
  jammer: "FTL Jammer",
  recover: "Drone Recovery Arm",
  stun: "Hacking Stun",
  dna: "Backup DNA Bank",
  mend: "Reconstructive Teleport",
  pulseeye: "Lifeform Scanner",
  nav: "Adv. FTL Navigation",
  scrambler: "Defense Scrambler",
  bypass: "Zoltan Shield Bypass",
};

const COSTS: Record<CatalogId, number> = {
  feed: 40,
  echo: 60,
  quiet: 50,
  hot: 120,
  weld: 50,
  baffle: 45,
  coil: 45,
  spool: 50,
  hook: 50,
  keel: 50,
  casing: 50,
  tap: 40,
  lung: 50,
  squall: 65,
  falsebuoy: 55,
  glass: 30,
  jammer: 30,
  recover: 50,
  stun: 60,
  dna: 40,
  mend: 70,
  pulseeye: 40,
  nav: 50,
  scrambler: 80,
  bypass: 55,
};

function gun(partial: Partial<WeaponInst> & Pick<WeaponInst, "uid" | "defId">): WeaponInst {
  return {
    charge: 0,
    enabled: true,
    autofire: false,
    target: null,
    ...partial,
  };
}

describe("augments", () => {
  it("lists original names and page prices", () => {
    const ids = Object.keys(NAMES) as CatalogId[];
    assert.equal(CATALOG.length, ids.length);
    for (const id of ids) {
      const row = CATALOG.find((item) => item.id === id);
      assert.ok(row, id);
      assert.equal(row.name, NAMES[id]);
      assert.equal(row.cost, COSTS[id]);
      assert.ok(row.detail.length > 0);
    }
  });

  it("speeds charge by 1 + copies/10 and leaves the other hull at 1", () => {
    const g = createGame(1);
    assert.equal(feedRate(g, "player"), 1);
    g.augments = ["feed", "feed"];
    assert.equal(feedRate(g, "player"), 1.2);
    assert.equal(feedRate(g, "enemy"), 1);
  });

  it("uses the wiki jump-charge times of 80, 67, and 57 percent", () => {
    const g = createGame(1);
    assert.equal(spoolRate(g), 1);
    g.augments = ["spool"];
    assert.equal(spoolRate(g), 0.8);
    g.augments = ["spool", "spool"];
    assert.equal(spoolRate(g), 0.67);
    g.augments = ["spool", "spool", "spool"];
    assert.equal(spoolRate(g), 0.57);
  });

  it("adds hook before the weld cut, then floors, and heals hull by 2", () => {
    const g = createGame(1);
    g.player.hull = 12;
    g.augments = ["hook"];
    assert.equal(adjustScrapAmount(g, 10), 11);
    assert.equal(g.player.hull, 12);

    g.augments = ["weld"];
    assert.equal(adjustScrapAmount(g, 10), 8);
    assert.equal(g.player.hull, 14);

    g.player.hull = g.player.hullMax;
    assert.equal(adjustScrapAmount(g, 10), 10);
    assert.equal(g.player.hull, g.player.hullMax);

    g.augments = ["hook", "weld"];
    assert.equal(adjustScrapAmount(g, 10), 11);
    assert.equal(g.player.hull, g.player.hullMax);

    g.player.hull = 10;
    assert.equal(adjustScrapAmount(g, 10), 9);
    assert.equal(g.player.hull, 12);
  });

  it("holds every ion hit when two baffles are pushed on", () => {
    const g = createGame(1);
    const seed = g.seed;
    assert.equal(baffleHolds(g), false);
    assert.equal(g.seed, seed);

    g.augments = ["baffle", "baffle"];
    assert.equal(baffleHolds(g), true);
    assert.equal(baffleHolds(g), true);
    assert.equal(g.seed, seed);
  });

  it("does not roll keel or casing unless that plate is fitted", () => {
    const g = createGame(1);
    const seed = g.seed;
    assert.equal(keelHolds(g), false);
    assert.equal(casingHolds(g), false);
    assert.equal(saveMissile(g), false);
    assert.equal(g.seed, seed);
  });

  it("charges only enabled guns that have power", () => {
    const g = createGame(1);
    g.player.weapons = [
      gun({ uid: "w-line", defId: "lineburst", charge: 0.2 }),
      gun({ uid: "w-spark", defId: "spark", charge: 0.4 }),
    ];
    primeWeapons(g);
    assert.equal(g.player.weapons[0].charge, 0.2);

    g.augments = ["hot"];
    primeWeapons(g);
    assert.equal(g.player.weapons[0].charge, 1);
    assert.equal(g.player.weapons[1].charge, 0.4);

    g.player.weapons[0].enabled = false;
    g.player.weapons[0].charge = 0.25;
    g.player.systems.weapons.power = 3;
    primeWeapons(g);
    assert.equal(g.player.weapons[0].charge, 0.25);
    assert.equal(g.player.weapons[1].charge, 1);
  });

  it("adds shield speed per coil and halves suffocation only for the player", () => {
    const g = createGame(1);
    assert.equal(coilRate(g, "player"), 1);
    assert.equal(lungScale(g, "player"), 1);
    g.augments = ["coil", "coil", "lung"];
    assert.equal(coilRate(g, "player"), 1.3);
    assert.equal(coilRate(g, "enemy"), 1);
    assert.equal(lungScale(g, "player"), 0.5);
    assert.equal(lungScale(g, "enemy"), 1);
  });

  it("puts player fires out by twice the tick and ignores the other hull", () => {
    const g = createGame(1);
    g.player.rooms[0].fire = 1;
    g.player.rooms[1].fire = 0.1;
    const enemyRooms = g.player.rooms.map((room) => ({ ...room, fire: 2 }));
    g.enemy = { ...g.player, rooms: enemyRooms };
    tickSquall(g, 0.25);
    assert.equal(g.player.rooms[0].fire, 1);

    g.augments = ["squall"];
    tickSquall(g, 0.25);
    assert.equal(g.player.rooms[0].fire, 0.5);
    assert.equal(g.player.rooms[1].fire, 0);
    assert.equal(g.enemy.rooms[0].fire, 2);
  });

  it("drops the fleet one jump before sector 8 and not on the last", () => {
    const g = createGame(1);
    g.sector = 3;
    g.fleet = 4;
    onNewSector(g);
    assert.equal(g.fleet, 4);

    g.augments = ["falsebuoy"];
    onNewSector(g);
    assert.equal(g.fleet, 3);

    g.fleet = 0;
    onNewSector(g);
    assert.equal(g.fleet, 0);
    assert.equal(g.buoyDelay, 1);

    g.sector = 8;
    g.fleet = 4;
    onNewSector(g);
    assert.equal(g.fleet, 4);
  });

  it("reveals every beacon kind only when glass is fitted", () => {
    const g = createGame(1);
    assert.equal(reveals(g, "hostile"), false);
    assert.equal(reveals(g, "empty"), false);
    g.augments = ["glass"];
    assert.equal(reveals(g, "store"), true);
    assert.equal(reveals(g, "nebula"), true);
  });

  it("spends the catalog cost, caps at 3, and refuses duplicates", () => {
    const g = createGame(1);
    g.scrap = 10;
    assert.equal(installAugment(g, "hot"), false);
    assert.deepEqual(g.augments, []);
    assert.equal(g.scrap, 10);

    g.scrap = 500;
    assert.equal(installAugment(g, "baffle"), true);
    assert.equal(installAugment(g, "baffle"), false);
    assert.deepEqual(g.augments, ["baffle"]);
    assert.equal(g.scrap, 500 - 45);

    assert.equal(installAugment(g, "glass"), true);
    assert.equal(installAugment(g, "feed"), true);
    assert.equal(g.augments.length, 3);
    const scrap = g.scrap;
    assert.equal(installAugment(g, "echo"), false);
    assert.equal(g.augments.length, 3);
    assert.equal(g.scrap, scrap);
    assert.equal(g.augments.includes("echo"), false);
  });

  it("refuses to sell medbot, which has no purchase price", () => {
    const g = createGame(1);
    g.scrap = 500;
    assert.equal(installAugment(g, "medbot"), false);
    assert.deepEqual(g.augments, []);
    assert.equal(g.scrap, 500);
  });

  it("heals crew outside a powered medbay at 1.6 per second", () => {
    const g = createGame(1);
    const ada = g.crew.find((c) => c.id === "c-ada");
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    const nen = g.crew.find((c) => c.id === "c-nen");
    assert.ok(ada && ivo && nen);
    ada.hp = 40;
    ivo.hp = 50;
    nen.hp = 99;
    g.player.systems.medbay.power = 1;

    tickMedbot(g, 1);
    assert.equal(ada.hp, 40);

    g.augments = ["medbot"];
    tickMedbot(g, 1);
    assert.equal(ada.hp, 41.6);
    assert.equal(ivo.hp, 51.6);
    assert.equal(nen.hp, 100);

    // Augmentations, Engi Med-bot Dispersal: the medbay room itself is not "outside".
    ada.room = "p-medbay";
    tickMedbot(g, 1);
    assert.equal(ada.hp, 41.6);

    // Same bullet: crew on another ship are not healed.
    ada.room = "p-pilot";
    ada.aboard = "enemy";
    tickMedbot(g, 1);
    assert.equal(ada.hp, 41.6);
    ada.aboard = "player";

    // Medbay level does not change the 1.6.
    ivo.room = "p-engines";
    g.player.systems.medbay.level = 3;
    g.player.systems.medbay.power = 3;
    const before = ivo.hp;
    tickMedbot(g, 1);
    assert.equal(ivo.hp, before + 1.6);

    // One ion point on a single powered bar leaves the medbay unpowered.
    g.player.systems.medbay.level = 1;
    g.player.systems.medbay.power = 1;
    g.player.systems.medbay.ion = [5];
    tickMedbot(g, 1);
    assert.equal(ivo.hp, before + 1.6);
    g.player.systems.medbay.ion = [];
    g.player.systems.medbay.power = 0;
    tickMedbot(g, 1);
    assert.equal(ivo.hp, before + 1.6);

    // A clone bay makes the augment do nothing, even with a powered medbay.
    g.player.systems.medbay.power = 1;
    g.player.kits.cradle = {
      id: "cradle",
      level: 1,
      power: 0,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    } satisfies Kit;
    tickMedbot(g, 1);
    assert.equal(ivo.hp, before + 1.6);

    g.player.kits.cradle = undefined;
    const boarder = { ...nen, id: "c-foe", side: "enemy" as const, hp: 10, maxHp: 100, room: "p-weapons" };
    g.crew.push(boarder);
    tickSquall(g, 1);
    assert.equal(ivo.hp, before + 1.6 + 1.6);
    assert.equal(boarder.hp, 10);
    assert.equal(nen.hp, 100);
  });
});

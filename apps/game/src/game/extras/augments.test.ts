import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, FIRE_FIGHT_SHARE, startCombat, step } from "../sim.ts";
import type { AugmentId, Crew, Kit, WeaponInst } from "../types.ts";
import { crystalExtinguishScale } from "../wiki/cited-crystal-fire.ts";
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
  scanMark,
  spoolRate,
  tickMedbot,
  tickSquall,
} from "./augments.ts";

/** Sold rows only. medbot, gel, pheromone, booster, vengeance, stasis, and zshield have no purchase price and are not in CATALOG. */
type CatalogId = Exclude<AugmentId, "NANO_MEDBAY" | "SLUG_GEL" | "CREW_STIMS" | "DRONE_SPEED" | "CRYSTAL_SHARDS" | "STASIS_POD" | "ENERGY_SHIELD">;

const NAMES: Record<CatalogId, string> = {
  AUTO_COOLDOWN: "Automated Re-loader",
  EXPLOSIVE_REPLICATOR: "Explosive Replicator",
  CLOAK_FIRE: "Stealth Weapons",
  WEAPON_PREIGNITE: "Weapon Pre-Igniter",
  REPAIR_ARM: "Repair Arm",
  ION_ARMOR: "Reverse Ion Field",
  SHIELD_RECHARGE: "Shield Charge Booster",
  FTL_BOOSTER: "FTL Recharge Booster",
  SCRAP_COLLECTOR: "Scrap Recovery Arm",
  ROCK_ARMOR: "Rock Plating",
  SYSTEM_CASING: "Titanium System Casing",
  BATTERY_BOOSTER: "Battery Charger",
  O2_MASKS: "Emergency Respirators",
  FIRE_EXTINGUISHERS: "Fire Suppression",
  FLEET_DISTRACTION: "Distraction Buoys",
  ADV_SCANNERS: "Long-Ranged Scanners",
  FTL_JAMMER: "FTL Jammer",
  DRONE_RECOVERY: "Drone Recovery Arm",
  HACKING_STUN: "Hacking Stun",
  BACKUP_DNA: "Backup DNA Bank",
  TELEPORT_HEAL: "Reconstructive Teleport",
  LIFE_SCANNER: "Lifeform Scanner",
  FTL_JUMPER: "Adv. FTL Navigation",
  DEFENSE_SCRAMBLER: "Defense Scrambler",
  ZOLTAN_BYPASS: "Zoltan Shield Bypass",
};

const COSTS: Record<CatalogId, number> = {
  AUTO_COOLDOWN: 40,
  EXPLOSIVE_REPLICATOR: 60,
  CLOAK_FIRE: 50,
  WEAPON_PREIGNITE: 120,
  REPAIR_ARM: 50,
  ION_ARMOR: 45,
  SHIELD_RECHARGE: 45,
  FTL_BOOSTER: 50,
  SCRAP_COLLECTOR: 50,
  ROCK_ARMOR: 50,
  SYSTEM_CASING: 50,
  BATTERY_BOOSTER: 40,
  O2_MASKS: 50,
  FIRE_EXTINGUISHERS: 65,
  FLEET_DISTRACTION: 55,
  ADV_SCANNERS: 30,
  FTL_JAMMER: 30,
  DRONE_RECOVERY: 50,
  HACKING_STUN: 60,
  BACKUP_DNA: 40,
  TELEPORT_HEAL: 70,
  LIFE_SCANNER: 40,
  FTL_JUMPER: 50,
  DEFENSE_SCRAMBLER: 80,
  ZOLTAN_BYPASS: 55,
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
    g.augments = ["AUTO_COOLDOWN", "AUTO_COOLDOWN"];
    assert.equal(feedRate(g, "player"), 1.2);
    assert.equal(feedRate(g, "enemy"), 1);
  });

  it("uses the wiki jump-charge times of 80, 67, and 57 percent", () => {
    const g = createGame(1);
    assert.equal(spoolRate(g), 1);
    g.augments = ["FTL_BOOSTER"];
    assert.equal(spoolRate(g), 0.8);
    g.augments = ["FTL_BOOSTER", "FTL_BOOSTER"];
    assert.equal(spoolRate(g), 0.67);
    g.augments = ["FTL_BOOSTER", "FTL_BOOSTER", "FTL_BOOSTER"];
    assert.equal(spoolRate(g), 0.57);
  });

  it("adds hook before the weld cut, then floors, and heals hull by 2", () => {
    const g = createGame(1);
    g.player.hull = 12;
    g.augments = ["SCRAP_COLLECTOR"];
    assert.equal(adjustScrapAmount(g, 10), 11);
    assert.equal(g.player.hull, 12);

    g.augments = ["REPAIR_ARM"];
    assert.equal(adjustScrapAmount(g, 10), 8);
    assert.equal(g.player.hull, 14);

    g.player.hull = g.player.hullMax;
    assert.equal(adjustScrapAmount(g, 10), 10);
    assert.equal(g.player.hull, g.player.hullMax);

    g.augments = ["SCRAP_COLLECTOR", "REPAIR_ARM"];
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

    g.augments = ["ION_ARMOR", "ION_ARMOR"];
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
      gun({ uid: "w-line", defId: "LASER_BURST_3", charge: 0.2 }),
      gun({ uid: "w-spark", defId: "LASER_BURST_1", charge: 0.4 }),
    ];
    primeWeapons(g);
    assert.equal(g.player.weapons[0].charge, 0.2);

    g.augments = ["WEAPON_PREIGNITE"];
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

  it("adds shield speed per coil and halves suffocation for the player's own crew", () => {
    const g = createGame(1);
    const yours = { side: "player" } as Crew;
    const theirs = { side: "enemy" } as Crew;
    assert.equal(coilRate(g, "player"), 1);
    assert.equal(lungScale(g, yours), 1);
    g.augments = ["SHIELD_RECHARGE", "SHIELD_RECHARGE", "O2_MASKS"];
    assert.equal(coilRate(g, "player"), 1.3);
    assert.equal(coilRate(g, "enemy"), 1);
    assert.equal(lungScale(g, yours), 0.5);
    // A leash does not lend the player's augment to an enemy, or take it off your own crew.
    yours.leashed = 4;
    theirs.leashed = 4;
    assert.equal(lungScale(g, yours), 0.5);
    assert.equal(lungScale(g, theirs), 1);
    // Boarders: Humans (Abandoned): the augment is on the boarder, not the enemy hull.
    theirs.lungs = true;
    assert.equal(lungScale(g, theirs), 0.5);
  });

  it("puts player fires out at Crystal speed and ignores the other hull", () => {
    const g = createGame(1);
    g.player.rooms[0].fire = 1;
    g.player.rooms[1].fire = 0.1;
    const enemyRooms = g.player.rooms.map((room) => ({ ...room, fire: 2 }));
    g.enemy = { ...g.player, rooms: enemyRooms };
    tickSquall(g, 0.25);
    assert.equal(g.player.rooms[0].fire, 1);

    g.augments = ["FIRE_EXTINGUISHERS"];
    tickSquall(g, 0.25);
    const drop = 0.25 * FIRE_FIGHT_SHARE * crystalExtinguishScale();
    assert.equal(g.player.rooms[0].fire, 1 - drop);
    assert.equal(g.player.rooms[1].fire, 0.1 - drop);
    assert.ok(g.player.rooms[1].fire > 0);
    assert.equal(g.enemy.rooms[0].fire, 2);
  });

  it("drops the fleet one jump before sector 8 and not on the last", () => {
    const g = createGame(1);
    g.sector = 3;
    g.fleet = 4;
    onNewSector(g);
    assert.equal(g.fleet, 4);

    g.augments = ["FLEET_DISTRACTION"];
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

  it("reveals ship presence only when glass is fitted", () => {
    const g = createGame(1);
    assert.equal(reveals(g, "hostile"), false);
    assert.equal(reveals(g, "empty"), false);
    assert.equal(reveals(g, "store"), false);
    assert.equal(reveals(g, "nebula"), false);
    g.augments = ["ADV_SCANNERS"];
    assert.equal(reveals(g, "store"), false);
    assert.equal(reveals(g, "empty"), false);
    assert.equal(reveals(g, "nebula"), false);
    assert.equal(reveals(g, "event"), false);
    assert.equal(reveals(g, "cache"), false);
    assert.equal(reveals(g, "exit"), false);
    assert.equal(reveals(g, "start"), false);
    assert.equal(reveals(g, "hostile"), true);
    assert.equal(reveals(g, "distress"), true);
    assert.equal(reveals(g, "boss"), true);
  });

  it("marks a hazard or a ship only while glass is fitted", () => {
    const g = createGame(1);
    const rock = { kind: "event" as const, asteroid: true, flag: "", name: "Silt" };
    assert.equal(scanMark(g, rock).hazard, false);
    assert.equal(scanMark(g, rock).ship, false);

    g.augments = ["ADV_SCANNERS"];
    assert.equal(scanMark(g, rock).hazard, true);
    assert.equal(scanMark(g, rock).ship, false);

    for (const flag of ["sun", "Red Giant", "PULSAR", "plasma storm", "Ion Storm", "asteroid field"]) {
      const marked = scanMark(g, { kind: "empty", asteroid: false, flag, name: "Beacon" });
      assert.equal(marked.hazard, true, flag);
      assert.equal(marked.ship, false, flag);
    }
    const named = scanMark(g, { kind: "empty", asteroid: false, flag: "", name: "red giant" });
    assert.equal(named.hazard, true);
    assert.equal(named.ship, false);

    const quiet = scanMark(g, { kind: "event", asteroid: false, flag: "", name: "Silt" });
    assert.equal(quiet.hazard, false);
    assert.equal(quiet.ship, false);

    const nebula = { kind: "nebula" as const, asteroid: false, flag: "", name: "Nebula" };
    assert.equal(scanMark(g, nebula).hazard, false);
    assert.equal(scanMark(g, nebula).ship, false);

    const hostile = { kind: "hostile" as const, asteroid: false, flag: "", name: "Picket" };
    assert.equal(scanMark(g, hostile).ship, true);
    assert.equal(scanMark(g, hostile).hazard, false);

    const both = { kind: "distress" as const, asteroid: true, flag: "pulsar", name: "Flare" };
    assert.deepEqual(scanMark(g, both), { ship: true, hazard: true });

    g.augments = g.augments.filter((id) => id !== "ADV_SCANNERS");
    assert.deepEqual(scanMark(g, both), { ship: false, hazard: false });
    assert.deepEqual(scanMark(g, rock), { ship: false, hazard: false });
    assert.equal(reveals(g, "hostile"), false);
  });

  it("marks a ship on quest markers whose pages say a ship is there", () => {
    const g = createGame(1);
    const beacon = { kind: "event" as const, asteroid: false, flag: "", name: "Quest" };
    const ships = ["zoltan-peace", "fed-assist", "capture-ship", "engi-real", "engi-fake", "engi-final", "rock-sun", "rock-shipyard", "mantis-chase"];
    const dark = ["merchant-delivery", "fed-base", "slug-pirate-trap", "rock-bride", "slug-platform", "space-station"];
    for (const quest of [...ships, ...dark]) assert.equal(scanMark(g, { ...beacon, quest }).ship, false, quest);
    g.augments = ["ADV_SCANNERS"];
    for (const quest of ships) assert.equal(scanMark(g, { ...beacon, quest }).ship, true, quest);
    for (const quest of dark) assert.equal(scanMark(g, { ...beacon, quest }).ship, false, quest);
    assert.equal(scanMark(g, beacon).ship, false);
  });

  it("spends the catalog cost, caps at 3, and refuses duplicates", () => {
    const g = createGame(1);
    g.scrap = 10;
    assert.equal(installAugment(g, "WEAPON_PREIGNITE"), false);
    assert.deepEqual(g.augments, []);
    assert.equal(g.scrap, 10);

    g.scrap = 500;
    assert.equal(installAugment(g, "ION_ARMOR"), true);
    assert.equal(installAugment(g, "ION_ARMOR"), false);
    assert.deepEqual(g.augments, ["ION_ARMOR"]);
    assert.equal(g.scrap, 500 - 45);

    assert.equal(installAugment(g, "ADV_SCANNERS"), true);
    assert.equal(installAugment(g, "AUTO_COOLDOWN"), true);
    assert.equal(g.augments.length, 3);
    const scrap = g.scrap;
    assert.equal(installAugment(g, "EXPLOSIVE_REPLICATOR"), false);
    assert.equal(g.augments.length, 3);
    assert.equal(g.scrap, scrap);
    // Re-read through a cast: the deepEqual above narrows g.augments to never[] for TypeScript.
    assert.equal((g.augments as AugmentId[]).includes("EXPLOSIVE_REPLICATOR"), false);
  });

  it("refuses to sell medbot, which has no purchase price", () => {
    const g = createGame(1);
    g.scrap = 500;
    assert.equal(installAugment(g, "NANO_MEDBAY"), false);
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

    g.augments = ["NANO_MEDBAY"];
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
    g.player.kits.clonebay = {
      id: "clonebay",
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

    g.player.kits.clonebay = undefined;
    const boarder = { ...nen, id: "c-foe", side: "enemy" as const, hp: 10, maxHp: 100, room: "p-weapons" };
    g.crew.push(boarder);
    tickSquall(g, 1);
    assert.equal(ivo.hp, before + 1.6 + 1.6);
    assert.equal(boarder.hp, 10);
    assert.equal(nen.hp, 100);
  });

  it("heals Engi enemy crew outside a powered medbay at 1.6 per second", () => {
    const g = createGame(1);
    g.sector = 5;
    startCombat(g, "Engi ship");
    const enemy = g.enemy;
    assert.ok(enemy);
    assert.equal(enemy.faction, "engi");
    assert.equal(g.augments.includes("NANO_MEDBAY"), false);
    enemy.kits.clonebay = undefined;

    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    const ada = g.crew.find((c) => c.id === "c-ada");
    assert.ok(foe && ada);
    const outside = enemy.rooms.find((r) => r.system !== "medbay");
    assert.ok(outside);
    foe.room = outside.id;
    foe.aboard = "enemy";
    foe.hp = 10;
    ada.hp = 40;
    ada.aboard = "player";
    ada.room = "p-pilot";

    enemy.systems.medbay.level = 1;
    enemy.systems.medbay.power = 1;
    enemy.systems.medbay.damage = 0;
    enemy.systems.medbay.ion = [];
    // A player clone bay does not block the Engi hull.
    g.player.kits.clonebay = {
      id: "clonebay",
      level: 1,
      power: 0,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    } satisfies Kit;

    tickMedbot(g, 0);
    tickMedbot(g, -1);
    assert.equal(foe.hp, 10);
    assert.equal(ada.hp, 40);

    // Engi Ships: the augment heals when they have a powered Medbay. No "NANO_MEDBAY" id on the player.
    tickMedbot(g, 1);
    assert.equal(foe.hp, 11.6);
    assert.equal(ada.hp, 40);
    g.player.kits.clonebay = undefined;

    enemy.systems.medbay.power = 0;
    tickMedbot(g, 1);
    assert.equal(foe.hp, 11.6);

    enemy.systems.medbay.level = 0;
    enemy.systems.medbay.power = 0;
    tickMedbot(g, 1);
    assert.equal(foe.hp, 11.6);

    enemy.systems.medbay.level = 1;
    enemy.systems.medbay.power = 1;
    enemy.systems.medbay.damage = 0;
    enemy.systems.medbay.ion = [];
    // "Does nothing if you have a Clone Bay." The enemy bay does not block the player copy.
    enemy.kits.clonebay = {
      id: "clonebay",
      level: 1,
      power: 0,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    } satisfies Kit;
    tickMedbot(g, 1);
    assert.equal(foe.hp, 11.6);

    g.augments = ["NANO_MEDBAY"];
    g.player.systems.medbay.level = 1;
    g.player.systems.medbay.power = 1;
    g.player.systems.medbay.damage = 0;
    g.player.systems.medbay.ion = [];
    tickMedbot(g, 1);
    assert.equal(ada.hp, 41.6);
    assert.equal(foe.hp, 11.6);
    g.augments = [];
    enemy.kits.clonebay = undefined;

    // "Does not work on crew that is on another ship (teleported)."
    foe.aboard = "player";
    tickMedbot(g, 1);
    assert.equal(foe.hp, 11.6);
    foe.aboard = "enemy";

    // "Engi nano med-bots heal the crew outside of the med-bay (at a reduced speed)."
    const bay = enemy.rooms.find((r) => r.system === "medbay");
    const stand = bay ?? enemy.rooms[0];
    const previous = stand.system;
    if (!bay) stand.system = "medbay";
    foe.room = stand.id;
    foe.hp = 20;
    tickMedbot(g, 1);
    assert.equal(foe.hp, 20);
    if (!bay) stand.system = previous;
    foe.room = outside.id;

    enemy.faction = "rebel";
    tickMedbot(g, 1);
    assert.equal(foe.hp, 20);

    // "Not affected by Medbay upgrades."
    enemy.faction = "engi";
    enemy.systems.medbay.level = 3;
    enemy.systems.medbay.power = 3;
    enemy.systems.medbay.damage = 0;
    enemy.systems.medbay.ion = [];
    tickMedbot(g, 1);
    assert.equal(foe.hp, 21.6);
    assert.equal(g.augments.includes("NANO_MEDBAY"), false);
  });
});

const TICK = 0.05;
const FULL = 6.4 * TICK;

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} vs ${expected}`);
}

/** Guns, cloak, and oxygen off, every room airless, so one tick is suffocation and medbay only. */
function airlessFight(seed: number) {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.player.hull = 400;
  g.enemy.hull = 400;
  g.player.systems.oxygen.power = 0;
  g.enemy.systems.oxygen.power = 0;
  for (const w of [...g.player.weapons, ...g.enemy.weapons]) {
    w.enabled = false;
    w.charge = 0;
    w.target = null;
  }
  for (const kit of Object.values(g.enemy.kits)) {
    if (!kit) continue;
    kit.power = 0;
    kit.on = false;
  }
  for (const r of [...g.player.rooms, ...g.enemy.rooms]) {
    r.o2 = 0;
    r.fire = 0;
    r.breach = 0;
  }
  return g;
}

function stand(c: Crew, aboard: "player" | "enemy", room: string, hp = 80) {
  c.aboard = aboard;
  c.room = room;
  c.path = [];
  c.hp = hp;
  c.maxHp = 100;
  c.stun = 5;
}

describe("Emergency Respirators", () => {
  it("is sold for 50", () => {
    assert.equal(CATALOG.find((entry) => entry.id === "O2_MASKS")?.cost, 50);
  });

  it("halves a boarder and quarters a Crystal, and leaves the enemy at full", () => {
    const g = airlessFight(3);
    const room = g.enemy!.rooms[0]!;
    const away = g.enemy!.rooms.find((r) => r.id !== room.id)!;
    for (const c of g.crew) if (c.room === room.id) c.room = away.id;
    const yours = g.crew.find((c) => c.side === "player")!;
    const theirs = g.crew.find((c) => c.side === "enemy")!;
    yours.kin = "human";
    theirs.kin = "human";
    stand(yours, "enemy", room.id);
    stand(theirs, "enemy", room.id);
    g.augments = ["O2_MASKS"];
    step(g, TICK);
    near(80 - yours.hp, FULL * 0.5);
    near(80 - theirs.hp, FULL);

    yours.kin = "crystal";
    stand(yours, "enemy", room.id);
    stand(theirs, "enemy", room.id);
    step(g, TICK);
    near(80 - yours.hp, FULL * 0.25);
    near(80 - theirs.hp, FULL);

    g.augments = [];
    yours.kin = "crystal";
    stand(yours, "enemy", room.id);
    step(g, TICK);
    near(80 - yours.hp, FULL * 0.5);
  });

  it("halves a hungry human who has the respirators and not one who does not", () => {
    const g = airlessFight(5);
    g.augments = [];
    const room = g.player.rooms.find((r) => r.system !== "medbay");
    const elsewhere = g.player.rooms.find((r) => r.id !== room?.id);
    assert.ok(room && elsewhere);
    const foe = g.crew.filter((c) => c.side === "enemy");
    assert.ok(foe.length >= 2);
    for (const c of g.crew) if (c !== foe[0] && c !== foe[1] && c.room === room.id) c.room = elsewhere.id;
    foe[0].kin = "human";
    foe[1].kin = "human";
    foe[0].lungs = true;
    foe[1].lungs = undefined;
    stand(foe[0], "player", room.id);
    stand(foe[1], "player", room.id);
    step(g, TICK);
    near(80 - foe[0].hp, FULL * 0.5);
    near(80 - foe[1].hp, FULL);
  });

  it("nets the printed airless medbay rates", () => {
    const g = airlessFight(4);
    const bay = g.player.rooms.find((r) => r.system === "medbay")!;
    const elsewhere = g.player.rooms.find((r) => r.id !== bay.id)!;
    const yours = g.crew.find((c) => c.side === "player")!;
    yours.kin = "human";
    for (const c of g.crew) if (c !== yours && c.room === bay.id) c.room = elsewhere.id;
    g.player.systems.medbay.damage = 0;
    g.player.systems.medbay.ion = [];

    const tickBay = (level: number, kin: Crew["kin"]) => {
      g.player.systems.medbay.level = level;
      g.player.systems.medbay.power = level;
      yours.kin = kin;
      stand(yours, "player", bay.id, 40);
      yours.stun = 0;
      step(g, TICK);
      return yours.hp - 40;
    };

    // Level 1 equals suffocation, so a human nets zero. The augment's half leaves +3.2 HP/s.
    g.augments = [];
    near(tickBay(1, "human"), 0);
    g.augments = ["O2_MASKS"];
    near(tickBay(1, "human"), FULL * 0.5);
    // Crystal's racial half nets the same +3.2 without the augment. With it, suffocation is a quarter.
    g.augments = [];
    near(tickBay(1, "crystal"), FULL * 0.5);
    g.augments = ["O2_MASKS"];
    near(tickBay(1, "crystal"), FULL * 0.75);
    // Level 2 heals at 9.6 in an airless bay with no augment. Level 3 heals at 19.2.
    g.augments = [];
    near(tickBay(2, "human"), 9.6 * TICK - FULL);
    near(tickBay(3, "human"), 19.2 * TICK - FULL);
  });
});

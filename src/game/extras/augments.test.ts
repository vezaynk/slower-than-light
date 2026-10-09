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

  it("adds shield speed per coil and halves suffocation for the player's own crew", () => {
    const g = createGame(1);
    const yours = { side: "player" } as Crew;
    const theirs = { side: "enemy" } as Crew;
    assert.equal(coilRate(g, "player"), 1);
    assert.equal(lungScale(g, yours), 1);
    g.augments = ["coil", "coil", "lung"];
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

    g.augments = ["squall"];
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

  it("reveals ship presence only when glass is fitted", () => {
    const g = createGame(1);
    assert.equal(reveals(g, "hostile"), false);
    assert.equal(reveals(g, "empty"), false);
    assert.equal(reveals(g, "store"), false);
    assert.equal(reveals(g, "nebula"), false);
    g.augments = ["glass"];
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

    g.augments = ["glass"];
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

    g.augments = g.augments.filter((id) => id !== "glass");
    assert.deepEqual(scanMark(g, both), { ship: false, hazard: false });
    assert.deepEqual(scanMark(g, rock), { ship: false, hazard: false });
    assert.equal(reveals(g, "hostile"), false);
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

  it("heals Engi enemy crew outside a powered medbay at 1.6 per second", () => {
    const g = createGame(1);
    g.sector = 5;
    startCombat(g, "Engi ship");
    const enemy = g.enemy;
    assert.ok(enemy);
    assert.equal(enemy.faction, "engi");
    assert.equal(g.augments.includes("medbot"), false);
    enemy.kits.cradle = undefined;

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

    tickMedbot(g, 0);
    tickMedbot(g, -1);
    assert.equal(foe.hp, 10);
    assert.equal(ada.hp, 40);

    // Engi Ships: the augment heals when they have a powered Medbay. No "medbot" id on the player.
    tickMedbot(g, 1);
    assert.equal(foe.hp, 11.6);
    assert.equal(ada.hp, 40);
    g.player.kits.cradle = undefined;

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
    enemy.kits.cradle = {
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
    assert.equal(foe.hp, 11.6);

    g.augments = ["medbot"];
    g.player.systems.medbay.level = 1;
    g.player.systems.medbay.power = 1;
    g.player.systems.medbay.damage = 0;
    g.player.systems.medbay.ion = [];
    tickMedbot(g, 1);
    assert.equal(ada.hp, 41.6);
    assert.equal(foe.hp, 11.6);
    g.augments = [];
    enemy.kits.cradle = undefined;

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
    assert.equal(g.augments.includes("medbot"), false);
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
    assert.equal(CATALOG.find((entry) => entry.id === "lung")?.cost, 50);
  });

  it("halves a boarder and quarters a Crystal, and leaves the enemy at full", () => {
    const g = airlessFight(3);
    const room = g.enemy!.rooms[0]!;
    const away = g.enemy!.rooms.find((r) => r.id !== room.id)!;
    for (const c of g.crew) if (c.room === room.id) c.room = away.id;
    const yours = g.crew.find((c) => c.side === "player")!;
    const theirs = g.crew.find((c) => c.side === "enemy")!;
    yours.kin = "plain";
    theirs.kin = "plain";
    stand(yours, "enemy", room.id);
    stand(theirs, "enemy", room.id);
    g.augments = ["lung"];
    step(g, TICK);
    near(80 - yours.hp, FULL * 0.5);
    near(80 - theirs.hp, FULL);

    yours.kin = "shard";
    stand(yours, "enemy", room.id);
    stand(theirs, "enemy", room.id);
    step(g, TICK);
    near(80 - yours.hp, FULL * 0.25);
    near(80 - theirs.hp, FULL);

    g.augments = [];
    yours.kin = "shard";
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
    foe[0].kin = "plain";
    foe[1].kin = "plain";
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
    yours.kin = "plain";
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
    near(tickBay(1, "plain"), 0);
    g.augments = ["lung"];
    near(tickBay(1, "plain"), FULL * 0.5);
    // Crystal's racial half nets the same +3.2 without the augment. With it, suffocation is a quarter.
    g.augments = [];
    near(tickBay(1, "shard"), FULL * 0.5);
    g.augments = ["lung"];
    near(tickBay(1, "shard"), FULL * 0.75);
    // Level 2 heals at 9.6 in an airless bay with no augment. Level 3 heals at 19.2.
    g.augments = [];
    near(tickBay(2, "plain"), 9.6 * TICK - FULL);
    near(tickBay(3, "plain"), 19.2 * TICK - FULL);
  });
});

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { hullById, playerHulls } from "../hulls.ts";
import "./base.ts";
import {
  allAugments,
  allDrones,
  allHulls,
  allSectors,
  allStores,
  allSystems,
  allTunes,
  allWeapons,
  augmentDef,
  crewDef,
  droneDef,
  hullDef,
  loadPack,
  resetPackForTests,
  sectorDef,
  startingFit,
  storeDef,
  systemDef,
  tuneDef,
  weaponDef,
} from "@stl/pack";
import type { CrewDef, HullDef, WeaponBlueprint } from "@stl/pack";

afterEach(() => resetPackForTests());

function race(id: string, hp: number): CrewDef {
  return {
    id,
    name: id,
    hp,
    move: 1,
    repair: 1,
    fight: 1,
    suffocate: 1,
    fireTaken: 1,
    bonusPower: 0,
    hasDeathExplosion: false,
    drainsOxygen: false,
    detectsLifeforms: false,
    resistsMindControl: false,
    lockdown: false,
    lockCooldown: 0,
    fireRepairMultiplier: 1,
  };
}

function gun(id: string, charge: number): WeaponBlueprint {
  return {
    id,
    name: id,
    kind: "laser",
    power: 1,
    charge,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 1,
    blurb: "",
  };
}

describe("content pack", () => {
  it("keeps the Zoltan and the Basic Laser on different ids", () => {
    assert.equal(crewDef("energy").name, "Zoltan");
    assert.equal(crewDef("energy").hp, 70);
    assert.equal(weaponDef("LASER_BURST_1")?.kind, "laser");
    assert.equal(weaponDef("LASER_BURST_1")?.charge, 10);
    assert.equal(weaponDef("energy"), undefined);
    assert.equal(crewDef("LASER_BURST_1").id, "human");
    assert.equal(crewDef("missing").hp, 100);
    assert.equal(crewDef("ghost").id, "ghost");
    assert.equal(crewDef("ghost").hp, 50);
    assert.equal(crewDef("ghost").suffocate, 0);
    assert.equal(crewDef("ghost").fireTaken, 1);
    const loaded = crewDef("human");
    loadPack(
      {
        crew: [{ ...loaded, id: "ghost", name: "Shade", hp: 40, suffocate: 1 }],
      },
      "append",
    );
    assert.equal(crewDef("ghost").name, "Shade");
    assert.equal(crewDef("ghost").hp, 40);
    assert.equal(crewDef("ghost").suffocate, 1);
  });

  it("copies beam length, speed, and crew damage onto the campaign guns", () => {
    assert.equal(weaponDef("BEAM_LONG")?.lengthTiles, 3.8);
    assert.equal(weaponDef("BEAM_LONG")?.speed, 9);
    assert.equal(weaponDef("BEAM_LONG")?.crewDamage, 15);
    assert.equal(weaponDef("LASER_BURST_1")?.lengthTiles, undefined);
  });

  it("loads the catalog in its authored order", () => {
    const sold = allAugments();
    assert.equal(sold.length, 25);
    assert.equal(sold[0]?.id, "AUTO_COOLDOWN");
    assert.equal(sold[0]?.name, "Automated Re-loader");
    assert.equal(sold[0]?.cost, 40);
    assert.equal(sold.find((row) => row.id === "O2_MASKS")?.cost, 50);
    assert.equal(sold.find((row) => row.id === "FTL_JUMPER")?.name, "Adv. FTL Navigation");
    assert.equal(sold.find((row) => row.id === "FTL_JUMPER")?.cost, 50);
    assert.equal(sold.at(-1)?.id, "ZOLTAN_BYPASS");
    assert.equal(sold.at(-1)?.name, "Zoltan Shield Bypass");
    assert.equal(sold.at(-1)?.cost, 55);
    for (const row of sold) assert.ok(row.detail.length > 0, row.id);
    for (const id of [
      "NANO_MEDBAY",
      "SLUG_GEL",
      "CREW_STIMS",
      "DRONE_SPEED",
      "CRYSTAL_SHARDS",
      "STASIS_POD",
      "ENERGY_SHIELD",
    ]) {
      assert.equal(
        sold.some((row) => row.id === id),
        false,
        id,
      );
    }
  });

  it("keeps an augment id apart from a race and a weapon", () => {
    const feed = augmentDef("AUTO_COOLDOWN");
    assert.ok(feed);
    assert.equal(feed.cost, 40);
    assert.equal(feed.name, "Automated Re-loader");
    loadPack(
      {
        augments: [
          { id: "spark", name: "Not the laser", detail: "", cost: 9 },
          { ...feed, name: "Reloaded", cost: 77 },
        ],
      },
      "append",
    );
    assert.equal(augmentDef("spark")?.name, "Not the laser");
    assert.equal(crewDef("energy").name, "Zoltan");
    assert.equal(weaponDef("LASER_BURST_1")?.kind, "laser");
    assert.equal(weaponDef("spark"), undefined);
    assert.equal(augmentDef("AUTO_COOLDOWN")?.cost, 77);
    assert.equal(allAugments().at(-1)?.id, "spark");
    resetPackForTests();
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(augmentDef("AUTO_COOLDOWN")?.cost, 40);
    assert.equal(augmentDef("AUTO_COOLDOWN")?.name, "Automated Re-loader");
  });

  it("loads the drone catalog in its authored order", () => {
    assert.deepEqual(
      allDrones().map((row) => [row.id, row.name, row.cost]),
      [
        ["COMBAT_1", "Combat Drone Mark I", 50],
        ["COMBAT_2", "Combat Drone Mark II", 75],
        ["COMBAT_BEAM", "Anti-Ship Beam Drone I", 50],
        ["COMBAT_BEAM_2", "Anti-Ship Beam Drone II", 60],
        ["DEFENSE_1", "Defense Drone Mark I", 50],
        ["DEFENSE_2", "Defense Drone Mark II", 70],
        ["ANTI_DRONE", "Anti-Combat Drone", 35],
        ["DRONE_SHIELD", "Shield Overcharger", 60],
        ["BATTLE", "Anti-Personnel Drone", 35],
        ["REPAIR", "System Repair Drone", 30],
        ["SHIP_REPAIR", "Hull Repair Drone", 85],
        ["BOARDER", "Boarding Drone", 70],
        ["BOARDER_ION", "Ion Intruder Drone", 65],
      ],
    );
  });

  it("keeps a drone id apart from a race, a weapon, and an augment", () => {
    loadPack({ drones: [{ id: "spark", name: "Not the laser", cost: 9 }] }, "append");
    assert.equal(droneDef("spark")?.name, "Not the laser");
    assert.equal(crewDef("energy").name, "Zoltan");
    assert.equal(weaponDef("LASER_BURST_1")?.kind, "laser");
    assert.equal(weaponDef("spark"), undefined);
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(allDrones().at(-1)?.id, "spark");
    resetPackForTests();
    assert.equal(droneDef("spark"), undefined);
    assert.equal(
      allDrones().some((row) => row.id === "spark"),
      false,
    );
  });

  it("loads the system catalog in its authored order", () => {
    // Wiki citations:
    // > "Additional systems and subsystems can only be purchased at a store." — [[Systems]]
    // > "Stealth Cruisers start without Shields system, and can buy one at a store for 125 scrap. This gives them Shields-2." — [[Shields#System Upgrades]]
    // > "1 50 Ftlgame-scrap.png 6.4 HP/sec The healing rate is equal to the suffocation rate" — [[Medbay#System Upgrades]]
    // > "1 50** Ftlgame-scrap.png 12 sec" — [[Clone Bay#System Upgrades]]
    // > "Purchasing or switching cost. (Medbay system upgrades are transferred to Clone Bay, and vice versa, automatically)" — [[Clone Bay#System Upgrades]]
    // > "1 90 Ftlgame-scrap.png 20 sec" — [[Crew Teleporter#System Upgrades]]
    // > "1 150 Ftlgame-scrap.png 5 sec" — [[Cloaking#System Upgrades]]
    // > "1 75 Ftlgame-scrap.png Mind control 1 enemy crew" — [[Mind Control#System Upgrades]]
    // > "1 80 Ftlgame-scrap.png 4 sec" — [[Hacking#System upgrades]]
    // > "1 40 Ftlgame-scrap.png See interior of all rooms on your ship" — [[Sensors#System Upgrades]]
    // > "1 60* Ftlgame-scrap.png Normal Doors Remote opening/closing of doors" — [[Door System#System Upgrades]]
    // > "Only the Rock Cruiser layout B (Shivan) does not have the Door System pre-installed." — [[Door System#System Upgrades]]
    // > "1 35 Ftlgame-scrap.png 2 temporary power bars" — [[Backup Battery#System Upgrades]]
    assert.deepEqual(
      allSystems().map((row) => ({ id: row.id, name: row.name, cost: row.cost, slot: row.slot })),
      [
        { id: "shields", name: "Shields", cost: 125, slot: "sys" },
        { id: "medbay", name: "Medbay", cost: 50, slot: "sys" },
        { id: "clonebay", name: "Clone Bay", cost: 50, slot: "kit" },
        { id: "teleporter", name: "Crew Teleporter", cost: 90, slot: "kit" },
        { id: "cloaking", name: "Cloaking", cost: 150, slot: "kit" },
        { id: "mind", name: "Mind Control", cost: 75, slot: "kit" },
        { id: "hacking", name: "Hacking", cost: 80, slot: "kit" },
        { id: "sensors", name: "Sensors", cost: 40, slot: "sys" },
        { id: "doors", name: "Door System", cost: 60, slot: "sys" },
        { id: "battery", name: "Backup Battery", cost: 35, slot: "kit" },
      ],
    );
  });

  it("keeps a system id apart from a race, a weapon, an augment, and a drone", () => {
    loadPack({ systems: [{ id: "spark", name: "Not the laser", cost: 9, slot: "sys" }] }, "append");
    assert.equal(systemDef("spark")?.name, "Not the laser");
    assert.equal(crewDef("energy").name, "Zoltan");
    assert.equal(weaponDef("LASER_BURST_1")?.kind, "laser");
    assert.equal(weaponDef("spark"), undefined);
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(droneDef("spark"), undefined);
    assert.equal(allSystems().at(-1)?.id, "spark");
    resetPackForTests();
    assert.equal(systemDef("spark"), undefined);
    assert.equal(systemDef("shields")?.cost, 125);
    assert.equal(systemDef("doors")?.name, "Door System");
    assert.equal(systemDef("doors")?.cost, 60);
  });

  it("loads the hull catalog in its authored order", () => {
    const players = playerHulls();
    const ids = allHulls().map((row) => row.id);
    const playerIds = ids.filter((id) => id.startsWith("PLAYER_SHIP_"));
    assert.deepEqual(
      playerIds,
      players.map((hull) => hull.id),
    );
    assert.ok(ids.length > players.length);
    assert.deepEqual(ids.slice(0, playerIds.length), playerIds);
    assert.equal(playerIds.includes("rebel-fighter"), false);
    assert.equal(hullById("ember"), undefined);
    assert.equal(hullById("REBEL_SKINNY"), undefined);
    assert.equal(hullDef("REBEL_SKINNY")?.layout, "rebel-fighter");
    const kestrel = hullById("PLAYER_SHIP_HARD");
    const packed = hullDef("PLAYER_SHIP_HARD");
    assert.equal(packed?.name, "The Kestrel");
    assert.equal(kestrel?.name, "The Kestrel");
    assert.equal(packed?.reactor, 8);
    assert.equal(kestrel?.reactor, 8);
    assert.equal(kestrel?.fuel, 16);
    assert.deepEqual(kestrel?.systems.weapons, [3, 0]);
    assert.deepEqual(packed?.weapons, kestrel?.weapons);
    // The blueprint carries levels and crew counts; the run's seats and levels come from them.
    assert.ok(packed && kestrel);
    const fit = startingFit(packed);
    assert.deepEqual(
      fit.crew.map((seat) => seat.kin),
      kestrel.crew.map((seat) => seat.kin),
    );
    const levels = (rows: Record<string, [number, number] | undefined>) =>
      Object.fromEntries(
        Object.entries(rows).flatMap(([id, pair]) => (pair && pair[0] > 0 ? [[id, pair[0]]] : [])),
      );
    assert.deepEqual(levels(fit.systems), levels(kestrel.systems));
  });

  it("keeps a hull id apart from a race, a weapon, an augment, a drone, and a system", () => {
    const ember: HullDef = {
      id: "spark",
      cruiser: "Spark",
      layout: "C",
      name: "Not the laser",
      quote: "",
      unlock: "",
      reactor: 4,
      missiles: 0,
      parts: 0,
      weapons: [],
      augments: [],
    };
    loadPack({ hulls: [ember] }, "append");
    assert.equal(hullDef("spark")?.name, "Not the laser");
    assert.equal(crewDef("energy").name, "Zoltan");
    assert.equal(weaponDef("LASER_BURST_1")?.kind, "laser");
    assert.equal(weaponDef("spark"), undefined);
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(droneDef("spark"), undefined);
    assert.equal(systemDef("spark"), undefined);
    assert.equal(allHulls().at(-1)?.id, "spark");
    assert.equal(hullById("spark"), undefined);
    assert.equal(hullById("ember"), undefined);
    resetPackForTests();
    assert.equal(hullDef("spark"), undefined);
    const restored = hullById("PLAYER_SHIP_HARD");
    assert.equal(restored?.name, "The Kestrel");
    assert.equal(restored?.reactor, 8);
    assert.equal(restored?.fuel, 16);
    assert.deepEqual(restored?.systems.weapons, [3, 0]);
  });

  it("loads the sector catalog in its authored order", () => {
    const sectors = allSectors();
    assert.equal(sectors.length, 19);
    assert.equal(sectors[0]?.id, "STANDARD_SPACE");
    assert.equal(sectors.at(-1)?.id, "FINAL");
    assert.equal(sectorDef("STANDARD_SPACE")?.name, "Civilian (Starting) Sector");
    assert.equal(sectorDef("STANDARD_SPACE")?.group, "civilian");
    assert.ok((sectorDef("STANDARD_SPACE")?.notes.length ?? 0) > 0);
    assert.equal(sectorDef("FINAL")?.name, "The Last Stand");
    assert.equal(sectorDef("SLUG_SECTOR")?.name, "Slug Controlled Nebula");
    assert.equal(sectorDef("CRYSTAL_HOME")?.name, "Hidden Crystal Worlds");
  });

  it("keeps a sector id apart from a race, a weapon, an augment, a drone, a system, and a hull", () => {
    loadPack(
      { sectors: [{ id: "spark", name: "Not the laser", group: "nebula", notes: ["Later."] }] },
      "append",
    );
    assert.equal(sectorDef("spark")?.name, "Not the laser");
    assert.equal(crewDef("energy").name, "Zoltan");
    assert.equal(weaponDef("LASER_BURST_1")?.kind, "laser");
    assert.equal(weaponDef("spark"), undefined);
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(droneDef("spark"), undefined);
    assert.equal(systemDef("spark"), undefined);
    assert.equal(hullDef("spark"), undefined);
    assert.equal(allSectors().at(-1)?.id, "spark");
    resetPackForTests();
    assert.equal(sectorDef("spark"), undefined);
    assert.equal(sectorDef("STANDARD_SPACE")?.name, "Civilian (Starting) Sector");
    assert.equal(sectorDef("STANDARD_SPACE")?.group, "civilian");
  });

  it("loads the store catalog in its authored order", () => {
    assert.equal(allStores().length, 1);
    assert.equal(allStores()[0]?.id, "standard");
    assert.equal(storeDef("standard")?.name, "Store");
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.name, "Fuel");
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.cost, 3);
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "missiles")?.cost, 6);
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "parts")?.cost, 8);
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "human")?.name, "Human");
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "human")?.cost, 45);
  });

  it("keeps a store id apart from a race, a weapon, an augment, a drone, a system, a hull, and a sector", () => {
    loadPack(
      {
        stores: [
          {
            id: "spark",
            name: "Not the laser",
            slot: 1,
            weapons: 0,
            sections: ["relics"],
            lines: [{ id: "fuel", kind: "fuel", name: "Ember Fuel", cost: 4, min: 1, max: 1 }],
          },
        ],
      },
      "append",
    );
    assert.equal(storeDef("spark")?.name, "Not the laser");
    assert.deepEqual(storeDef("spark")?.sections, ["relics"]);
    assert.equal(crewDef("energy").name, "Zoltan");
    assert.equal(weaponDef("LASER_BURST_1")?.kind, "laser");
    assert.equal(weaponDef("spark"), undefined);
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(droneDef("spark"), undefined);
    assert.equal(systemDef("spark"), undefined);
    assert.equal(hullDef("spark"), undefined);
    assert.equal(sectorDef("spark"), undefined);
    assert.equal(allStores().at(-1)?.id, "spark");
    resetPackForTests();
    assert.equal(storeDef("spark"), undefined);
    assert.equal(storeDef("standard")?.name, "Store");
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.cost, 3);
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "human")?.cost, 45);
  });

  it("loads every tune in archive order", () => {
    assert.equal(allTunes().length, 15);
    // A system that also has a tune is written when the emitter reaches it.
    // Clone Bay through Hacking sit before Sensors, so their tunes land there.
    // Artillery has no store listing and comes last.
    assert.deepEqual(
      allTunes().map((row) => row.id),
      [
        "shields",
        "engines",
        "oxygen",
        "medbay",
        "weapons",
        "pilot",
        "clonebay",
        "teleporter",
        "cloaking",
        "mind",
        "hacking",
        "sensors",
        "doors",
        "battery",
        "artillery",
      ],
    );
    for (const tune of allTunes()) {
      assert.equal(tuneDef(tune.id)?.start, tune.start);
      for (const step of tune.costs) {
        assert.equal(
          tuneDef(tune.id)?.costs.find((row) => row.level === step.level)?.cost,
          step.cost,
        );
      }
    }
    assert.equal(tuneDef("shields")?.start, 2);
    assert.equal(tuneDef("shields")?.costs.find((step) => step.level === 1)?.cost, 100);
    assert.equal(
      allSystems().some((row) => row.id === "engines"),
      false,
    );
    assert.equal(tuneDef("engines")?.costs.find((step) => step.level === 1)?.cost, 10);
    assert.equal(tuneDef("doors")?.costs.find((step) => step.level === 0)?.cost, 60);
  });

  it("keeps a tune id apart from a race, a weapon, a system, and a store", () => {
    loadPack({ tunes: [{ id: "spark", start: 4, costs: [{ level: 1, cost: 9 }] }] }, "append");
    assert.equal(tuneDef("spark")?.start, 4);
    assert.equal(crewDef("energy").name, "Zoltan");
    assert.equal(weaponDef("LASER_BURST_1")?.kind, "laser");
    assert.equal(weaponDef("spark"), undefined);
    assert.equal(systemDef("spark"), undefined);
    assert.equal(storeDef("spark"), undefined);
    assert.equal(allTunes().at(-1)?.id, "spark");
    assert.equal(
      allSystems().some((row) => row.id === "spark"),
      false,
    );
    resetPackForTests();
    assert.equal(tuneDef("spark"), undefined);
    assert.equal(tuneDef("shields")?.start, 2);
    assert.equal(tuneDef("shields")?.costs.find((step) => step.level === 1)?.cost, 100);
  });

  it("appends over an id and reset restores the campaign row", () => {
    const before = weaponDef("LASER_BURST_1")?.charge;
    loadPack({ crew: [race("ember", 40)], weapons: [gun("LASER_BURST_1", 4)] }, "append");
    assert.equal(crewDef("ember").hp, 40);
    assert.equal(weaponDef("LASER_BURST_1")?.charge, 4);
    assert.equal(crewDef("energy").hp, 70);
    assert.ok(allWeapons().some((row) => row.id === "LASER_BURST_1"));
    resetPackForTests();
    assert.equal(weaponDef("LASER_BURST_1")?.charge, before);
    assert.equal(crewDef("ember").id, "human");
  });
});

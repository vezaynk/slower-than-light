import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { CATALOG } from "../extras/augment-catalog.ts";
import { CITED_DRONES } from "../wiki/drone-catalog.ts";
import { HULLS } from "../hulls.ts";
import { SECTOR_TYPES } from "../wiki/sectors.ts";
import { STORES } from "../wiki/store-catalog.ts";
import { CITED_SYSTEMS } from "../wiki/system-catalog.ts";
import { SYSTEM_TUNES } from "../wiki/system-tunes.ts";
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
  });

  it("copies beam length, speed, and crew damage onto the campaign guns", () => {
    assert.equal(weaponDef("BEAM_LONG")?.lengthTiles, 3.8);
    assert.equal(weaponDef("BEAM_LONG")?.speed, 9);
    assert.equal(weaponDef("BEAM_LONG")?.crewDamage, 15);
    assert.equal(weaponDef("LASER_BURST_1")?.lengthTiles, undefined);
  });

  it("loads the catalog in its authored order", () => {
    assert.deepEqual(
      allAugments().map((row) => ({
        id: row.id,
        name: row.name,
        detail: row.detail,
        cost: row.cost,
      })),
      CATALOG.map((row) => ({ id: row.id, name: row.name, detail: row.detail, cost: row.cost })),
    );
  });

  it("keeps an augment id apart from a race and a weapon", () => {
    const feed = augmentDef("AUTO_COOLDOWN");
    assert.ok(feed);
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
    assert.equal(
      augmentDef("AUTO_COOLDOWN")?.cost,
      CATALOG.find((row) => row.id === "AUTO_COOLDOWN")?.cost,
    );
    assert.equal(
      augmentDef("AUTO_COOLDOWN")?.name,
      CATALOG.find((row) => row.id === "AUTO_COOLDOWN")?.name,
    );
  });

  it("loads the drone catalog in its authored order", () => {
    assert.deepEqual(
      allDrones().map((row) => ({ id: row.id, name: row.name, cost: row.cost })),
      CITED_DRONES.map((row) => ({ id: row.ref, name: row.name, cost: row.cost })),
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
    assert.deepEqual(
      allSystems().map((row) => ({ id: row.id, name: row.name, cost: row.cost, slot: row.slot })),
      CITED_SYSTEMS.map((row) => ({ id: row.ref, name: row.name, cost: row.cost, slot: row.slot })),
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
    assert.equal(
      systemDef("shields")?.cost,
      CITED_SYSTEMS.find((row) => row.ref === "shields")?.cost,
    );
  });

  it("loads the hull catalog in its authored order", () => {
    assert.deepEqual(
      allHulls()
        .map((row) => row.id)
        .slice(0, HULLS.length),
      HULLS.map((row) => row.id),
    );
    assert.ok(allHulls().length > HULLS.length);
    assert.equal(
      allHulls()
        .slice(0, HULLS.length)
        .some((row) => row.id === "rebel-fighter"),
      false,
    );
    const kestrel = HULLS.find((row) => row.id === "PLAYER_SHIP_HARD");
    const packed = hullDef("PLAYER_SHIP_HARD");
    assert.equal(packed?.name, kestrel?.name);
    assert.equal(packed?.reactor, kestrel?.reactor);
    assert.deepEqual(packed?.weapons, kestrel?.weapons);
    assert.deepEqual(packed?.crew, kestrel?.crew);
    assert.deepEqual(packed?.systems, kestrel?.systems);
    assert.deepEqual(packed?.kits, kestrel?.kits);
  });

  it("keeps a hull id apart from a race, a weapon, an augment, a drone, and a system", () => {
    const ember: HullDef = {
      id: "spark",
      cruiser: "Spark",
      layout: "C",
      name: "Not the laser",
      quote: "",
      unlock: "",
      source: "",
      reactor: 4,
      fuel: 1,
      missiles: 0,
      parts: 0,
      systems: {},
      weapons: [],
      crew: [],
      kits: {},
      augments: [],
      unfitted: [],
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
    const campaign = HULLS.find((row) => row.id === "PLAYER_SHIP_HARD");
    resetPackForTests();
    assert.equal(hullDef("spark"), undefined);
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.name, campaign?.name);
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.reactor, campaign?.reactor);
  });

  it("loads the sector catalog in its authored order", () => {
    assert.deepEqual(
      allSectors().map((row) => row.id),
      SECTOR_TYPES.map((row) => row.id),
    );
    const start = SECTOR_TYPES.find((row) => row.id === "civilian-start");
    assert.equal(sectorDef("civilian-start")?.name, start?.name);
    assert.equal(sectorDef("civilian-start")?.group, start?.group);
    assert.deepEqual(sectorDef("civilian-start")?.notes, start?.notes);
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
    const campaign = SECTOR_TYPES.find((row) => row.id === "civilian-start");
    resetPackForTests();
    assert.equal(sectorDef("spark"), undefined);
    assert.equal(sectorDef("civilian-start")?.name, campaign?.name);
  });

  it("loads the store catalog in its authored order", () => {
    assert.deepEqual(
      allStores().map((row) => row.id),
      STORES.map((row) => row.id),
    );
    const standard = STORES.find((row) => row.id === "standard");
    assert.equal(storeDef("standard")?.name, standard?.name);
    assert.equal(storeDef("standard")?.slot, standard?.slot);
    assert.deepEqual(storeDef("standard")?.sections, standard?.sections);
    assert.deepEqual(storeDef("standard")?.lines, standard?.lines);
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
    const campaign = STORES.find((row) => row.id === "standard");
    resetPackForTests();
    assert.equal(storeDef("spark"), undefined);
    assert.equal(storeDef("standard")?.name, campaign?.name);
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.cost, 3);
  });

  it("loads the tune catalog in its authored order", () => {
    assert.deepEqual(
      allTunes().map((row) => row.id),
      SYSTEM_TUNES.map((row) => row.id),
    );
    const shields = SYSTEM_TUNES.find((row) => row.id === "shields");
    assert.equal(tuneDef("shields")?.start, shields?.start);
    assert.deepEqual(tuneDef("shields")?.costs, shields?.costs);
    assert.equal(
      allSystems().some((row) => row.id === "engines"),
      false,
    );
    assert.equal(tuneDef("engines")?.costs.find((step) => step.level === 1)?.cost, 10);
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
    const shields = SYSTEM_TUNES.find((row) => row.id === "shields");
    resetPackForTests();
    assert.equal(tuneDef("spark"), undefined);
    assert.equal(tuneDef("shields")?.start, shields?.start);
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

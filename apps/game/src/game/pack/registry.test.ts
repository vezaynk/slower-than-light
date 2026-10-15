import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { CATALOG } from "../extras/augment-catalog.ts";
import { CITED_DRONES } from "../wiki/drone-catalog.ts";
import { HULLS } from "../hulls.ts";
import { SECTOR_TYPES } from "../wiki/sectors.ts";
import { CITED_SYSTEMS } from "../wiki/system-catalog.ts";
import "./base.ts";
import { allAugments, allDrones, allHulls, allSectors, allSystems, allWeapons, augmentDef, crewDef, droneDef, hullDef, loadPack, resetPackForTests, sectorDef, systemDef, weaponDef } from "./registry.ts";
import type { HullDef } from "./types.ts";
import type { CrewDef, WeaponBlueprint } from "./types.ts";

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
  it("keeps a race and a weapon that share an id apart", () => {
    assert.equal(crewDef("spark").name, "Zoltan");
    assert.equal(crewDef("spark").hp, 70);
    assert.equal(weaponDef("spark")?.kind, "laser");
    assert.equal(weaponDef("spark")?.charge, 10);
    assert.equal(crewDef("missing").hp, 100);
  });

  it("copies beam length, speed, and crew damage onto the campaign guns", () => {
    assert.equal(weaponDef("shear")?.lengthTiles, 3.8);
    assert.equal(weaponDef("shear")?.speed, 9);
    assert.equal(weaponDef("shear")?.crewDamage, 15);
    assert.equal(weaponDef("spark")?.lengthTiles, undefined);
  });

  it("loads the catalog in its authored order", () => {
    assert.deepEqual(
      allAugments().map((row) => ({ id: row.id, name: row.name, detail: row.detail, cost: row.cost })),
      CATALOG.map((row) => ({ id: row.id, name: row.name, detail: row.detail, cost: row.cost })),
    );
  });

  it("keeps an augment id apart from a race and a weapon", () => {
    const feed = augmentDef("feed");
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
    assert.equal(crewDef("spark").name, "Zoltan");
    assert.equal(weaponDef("spark")?.kind, "laser");
    assert.equal(augmentDef("feed")?.cost, 77);
    assert.equal(allAugments().at(-1)?.id, "spark");
    resetPackForTests();
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(augmentDef("feed")?.cost, CATALOG.find((row) => row.id === "feed")?.cost);
    assert.equal(augmentDef("feed")?.name, CATALOG.find((row) => row.id === "feed")?.name);
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
    assert.equal(crewDef("spark").name, "Zoltan");
    assert.equal(weaponDef("spark")?.kind, "laser");
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(allDrones().at(-1)?.id, "spark");
    resetPackForTests();
    assert.equal(droneDef("spark"), undefined);
    assert.equal(allDrones().some((row) => row.id === "spark"), false);
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
    assert.equal(crewDef("spark").name, "Zoltan");
    assert.equal(weaponDef("spark")?.kind, "laser");
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(droneDef("spark"), undefined);
    assert.equal(allSystems().at(-1)?.id, "spark");
    resetPackForTests();
    assert.equal(systemDef("spark"), undefined);
    assert.equal(systemDef("shields")?.cost, CITED_SYSTEMS.find((row) => row.ref === "shields")?.cost);
  });

  it("loads the hull catalog in its authored order", () => {
    assert.deepEqual(
      allHulls().map((row) => row.id),
      HULLS.map((row) => row.id),
    );
    const kestrel = HULLS.find((row) => row.id === "kestrel-a");
    const packed = hullDef("kestrel-a");
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
    assert.equal(crewDef("spark").name, "Zoltan");
    assert.equal(weaponDef("spark")?.kind, "laser");
    assert.equal(augmentDef("spark"), undefined);
    assert.equal(droneDef("spark"), undefined);
    assert.equal(systemDef("spark"), undefined);
    assert.equal(allHulls().at(-1)?.id, "spark");
    const campaign = HULLS.find((row) => row.id === "kestrel-a");
    resetPackForTests();
    assert.equal(hullDef("spark"), undefined);
    assert.equal(hullDef("kestrel-a")?.name, campaign?.name);
    assert.equal(hullDef("kestrel-a")?.reactor, campaign?.reactor);
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
    loadPack({ sectors: [{ id: "spark", name: "Not the laser", group: "nebula", notes: ["Later."] }] }, "append");
    assert.equal(sectorDef("spark")?.name, "Not the laser");
    assert.equal(crewDef("spark").name, "Zoltan");
    assert.equal(weaponDef("spark")?.kind, "laser");
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

  it("appends over an id and reset restores the campaign row", () => {
    const before = weaponDef("spark")?.charge;
    loadPack({ crew: [race("ember", 40)], weapons: [gun("spark", 4)] }, "append");
    assert.equal(crewDef("ember").hp, 40);
    assert.equal(weaponDef("spark")?.charge, 4);
    assert.ok(allWeapons().some((row) => row.id === "spark"));
    resetPackForTests();
    assert.equal(weaponDef("spark")?.charge, before);
    assert.equal(crewDef("ember").id, "plain");
  });
});

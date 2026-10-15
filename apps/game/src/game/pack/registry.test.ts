import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { CATALOG } from "../extras/augment-catalog.ts";
import "./base.ts";
import { allAugments, allWeapons, augmentDef, crewDef, loadPack, resetPackForTests, weaponDef } from "./registry.ts";
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

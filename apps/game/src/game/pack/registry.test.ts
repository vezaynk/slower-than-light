import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import "./base.ts";
import { allWeapons, crewDef, loadPack, resetPackForTests, weaponDef } from "./registry.ts";
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

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { emitPack } from "./emit.ts";
import { parsePack } from "./parse.ts";
import { crewDef, loadPack, resetPackForTests, tuneDef, weaponDef } from "./registry.ts";
import type { ContentPack, WeaponBlueprint } from "./types.ts";

const laser: WeaponBlueprint = {
  id: "ember",
  name: "Ember Laser",
  kind: "laser",
  power: 1,
  charge: 7,
  shots: 2,
  gap: 0.25,
  damage: 3,
  ion: 0,
  fire: 0.3,
  breach: 0.1,
  ammo: false,
  price: 20,
  blurb: "A short bolt.",
};

const pack: ContentPack = {
  crew: [
    {
      id: "plain",
      name: "Human",
      hp: 100,
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
    },
    {
      id: "ember",
      name: "Ember",
      hp: 40,
      move: 1.1,
      repair: 0.5,
      fight: 1.4,
      suffocate: 0.25,
      fireTaken: 0,
      bonusPower: 1,
      hasDeathExplosion: true,
      drainsOxygen: true,
      detectsLifeforms: true,
      resistsMindControl: true,
      lockdown: true,
      lockCooldown: 12,
      fireRepairMultiplier: 1.5,
    },
  ],
  weapons: [laser],
  tunes: [{ id: "shields", start: 2, costs: [{ level: 1, cost: 100 }] }],
};

afterEach(() => resetPackForTests());

describe("pack document", () => {
  it("round-trips a fixture through XML", () => {
    const back = parsePack(emitPack(pack));
    assert.deepEqual(back.crew, pack.crew);
    assert.deepEqual(back.weapons, pack.weapons);
    assert.deepEqual(back.tunes, pack.tunes);
  });

  it("round-trips names that contain markup characters", () => {
    const crew = pack.crew?.[0];
    assert.ok(crew);
    const odd: ContentPack = {
      crew: [{ ...crew, id: `a"b`, name: "Rock & <Stone>'s" }],
    };
    const back = parsePack(emitPack(odd));
    assert.equal(back.crew?.[0]?.id, `a"b`);
    assert.equal(back.crew?.[0]?.name, "Rock & <Stone>'s");
  });

  it("reads a title stored as character data", () => {
    const back = parsePack(`<FTL><race name="plain"><title><![CDATA[A & B]]></title></race></FTL>`);
    assert.equal(back.crew?.[0]?.name, "A & B");
  });

  it("rejects XML that is not well-formed", () => {
    assert.throws(() => parsePack("<race></crew>"), /not well-formed/);
    assert.throws(() => parsePack("<a/><b/>"), /not well-formed/);
    assert.throws(() => parsePack(`<FTL a=1></FTL>`), /not well-formed/);
  });

  it("keeps a shared id on separate maps and restores the base rows", () => {
    loadPack(pack, "base");
    assert.equal(crewDef("ember").hp, 40);
    assert.equal(weaponDef("ember")?.charge, 7);
    assert.equal(crewDef("missing").name, "Human");
    loadPack(
      {
        weapons: [{ ...laser, charge: 9 }],
        tunes: [{ id: "ember", start: 4, costs: [] }],
      },
      "append",
    );
    assert.equal(weaponDef("ember")?.charge, 9);
    assert.equal(crewDef("ember").hp, 40);
    assert.equal(tuneDef("ember")?.start, 4);
    assert.equal(tuneDef("shields")?.start, 2);
    resetPackForTests();
    assert.equal(weaponDef("ember")?.charge, 7);
    assert.equal(tuneDef("ember"), undefined);
  });
});

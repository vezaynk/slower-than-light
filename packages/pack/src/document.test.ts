import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { emitPack } from "./emit.ts";
import { parsePack } from "./parse.ts";
import { crewDef, emptyBeacon, eventDef, fillerList, loadPack, resetPackForTests, tuneDef, weaponDef } from "./registry.ts";
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
  events: [
    {
      id: "ember",
      dest: "Ember",
      flag: "cited:ember",
      aliases: ["Ember Page"],
      sectors: ["Civilian Sector"],
      body: "A packed beacon.",
      choices: [
        {
          id: "c:ember:0",
          label: "Take",
          fx: [
            { k: "res", id: "scrap", sign: 1, lo: 7, hi: 7 },
            { k: "fight", tier: "pirate", asteroid: true },
            { k: "note", text: "Rock & <Stone>" },
            { k: "quest", id: "ember-quest" },
            { k: "goto", id: "ember-next" },
            { k: "close" },
            { k: "nothing" },
          ],
        },
      ],
      surrender: {
        chance: 100,
        low: 0,
        high: 40,
        reward: { k: "weapon", name: "Anti-Bio Beam" },
        hail: "Yield.",
        hails: ["Yield.", "Please."],
        accept: "Spare them",
        refuse: "Finish them",
        continues: true,
        forced: true,
        quest: "ember-quest",
        result: "They leave.",
        extra: { id: "s:ember:info", label: "Ask" },
        card: { body: "Next.", choices: [{ id: "s:ember:go", label: "Go" }] },
      },
    },
  ],
  lists: [
    {
      id: "ember-list",
      entries: [
        { id: "large-asteroid-field", unique: true },
        { id: "refugee", unique: false },
      ],
    },
  ],
  empties: [
    {
      id: "ember-quiet",
      dest: "Ember quiet",
      sectors: ["Ember Reach"],
      texts: ["Still.", "Rock & <Stone>"],
      nebula: true,
    },
  ],
};

afterEach(() => resetPackForTests());

describe("pack document", () => {
  it("round-trips a fixture through XML", () => {
    const back = parsePack(emitPack(pack));
    assert.deepEqual(back.crew, pack.crew);
    assert.deepEqual(back.weapons, pack.weapons);
    assert.deepEqual(back.tunes, pack.tunes);
    assert.deepEqual(back.events, pack.events);
    assert.deepEqual(back.lists, pack.lists);
    assert.deepEqual(back.empties, pack.empties);
  });

  it("keeps a page body apart from its opening sentences", () => {
    const events = [
      { id: "one", dest: "One", flag: "cited:one", aliases: [], sectors: [], body: "Only", choices: [] },
      { id: "blank", dest: "Blank", flag: "cited:blank", aliases: [], sectors: [], body: "", texts: ["Alpha", "Beta"], choices: [] },
      { id: "same", dest: "Same", flag: "cited:same", aliases: [], sectors: [], body: "Alpha", texts: ["Alpha", "Beta"], choices: [] },
      { id: "aside", dest: "Aside", flag: "cited:aside", aliases: [], sectors: [], body: "Static", texts: ["Alpha", "Beta"], choices: [] },
    ];
    const xml = emitPack({ events });
    assert.deepEqual(parsePack(xml).events, events);
    const same = xml.slice(xml.indexOf('name="same"'), xml.indexOf('name="aside"'));
    assert.equal(same.includes('intro="after"'), false);
    assert.equal((same.match(/<text>Alpha<\/text>/g) ?? []).length, 1);
    const blank = xml.slice(xml.indexOf('name="blank"'), xml.indexOf('name="same"'));
    assert.match(blank, /<text><\/text>\s*<text>Alpha<\/text>/);
    assert.match(xml.slice(xml.indexOf('name="aside"')), /intro="after"/);
  });

  it("skips a nameless list and an empty beacon with no sentences", () => {
    const back = parsePack(`<FTL>
      <eventList><event id="orphan" unique="true"/></eventList>
      <eventList name="ember"><event unique="true"/><event id="kept"/></eventList>
      <emptyBeacon name="quiet"><title>Quiet</title></emptyBeacon>
      <emptyBeacon><title>No name</title><text>Hi</text></emptyBeacon>
      <emptyBeacon name="kept" nebula="true"><title>Kept</title><sector>Ember</sector><text>Still.</text></emptyBeacon>
    </FTL>`);
    assert.deepEqual(back.lists, [{ id: "ember", entries: [{ id: "kept", unique: false }] }]);
    assert.deepEqual(back.empties, [{ id: "kept", dest: "Kept", sectors: ["Ember"], texts: ["Still."], nebula: true }]);
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
        lists: [{ id: "ember-extra", entries: [{ id: "one", unique: true }] }],
        empties: [{ id: "ember-other", dest: "Other", sectors: [], texts: ["Gone."] }],
      },
      "append",
    );
    assert.equal(weaponDef("ember")?.charge, 9);
    assert.equal(crewDef("ember").hp, 40);
    assert.equal(tuneDef("ember")?.start, 4);
    assert.equal(tuneDef("shields")?.start, 2);
    assert.equal(fillerList("ember-list")?.entries.length, 2);
    assert.equal(fillerList("ember-extra")?.entries[0]?.id, "one");
    assert.equal(emptyBeacon("ember-quiet")?.nebula, true);
    assert.equal(emptyBeacon("ember-other")?.dest, "Other");
    resetPackForTests();
    assert.equal(weaponDef("ember")?.charge, 7);
    assert.equal(tuneDef("ember"), undefined);
    assert.equal(eventDef("ember")?.body, "A packed beacon.");
    assert.equal(fillerList("ember-extra"), undefined);
    assert.equal(fillerList("ember-list")?.entries.length, 2);
    assert.equal(emptyBeacon("ember-other"), undefined);
    assert.equal(emptyBeacon("ember-quiet")?.dest, "Ember quiet");
  });
});

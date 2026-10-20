import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentPack } from "@stl/pack";
import { emitMod, packFromMod } from "./mod.ts";

const pack: ContentPack = {
  facts: true,
  names: { pool: ["Ada Voss"], syllables: ["ka", "ren"] },
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
      detail: "Health 100. Shields & doors.",
      cost: 45,
    },
  ],
  weapons: [
    {
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
    },
  ],
  augments: [{ id: "FEED", name: "Re-loader", detail: "Weapons charge faster.", cost: 40 }],
  drones: [{ id: "STRIKER", name: "Striker", cost: 50 }],
  systems: [
    {
      id: "shields",
      name: "Shields",
      cost: 125,
      slot: "sys",
      detail: "Installs as a system.",
    },
    { id: "cradle", name: "Clone Bay", cost: 50, slot: "kit" },
  ],
  hulls: [
    {
      id: "kestrel-a",
      cruiser: "Kestrel Cruiser",
      layout: "A",
      name: "The Kestrel",
      quote: "A starter ship.",
      unlock: "",
      reactor: 5,
      missiles: 8,
      parts: 0,
      weapons: ["ember"],
      augments: ["FEED"],
      installs: [
        { id: "shields", power: 2, start: true },
        { id: "drones", power: 1, start: true },
      ],
      crewCounts: [{ amount: 1, class: "plain" }],
    },
  ],
  sectors: [{ id: "civilian", name: "Civilian", group: "civilian", notes: ["Quiet jumps."] }],
  stores: [
    {
      id: "store",
      name: "Store",
      slot: 3,
      weapons: 2,
      sections: ["weapons", "fuel"],
      lines: [{ id: "fuel", kind: "fuel", name: "Fuel", cost: 6, min: 1, max: 3 }],
    },
  ],
  tunes: [{ id: "shields", start: 2, costs: [{ level: 1, cost: 100 }] }],
  events: [
    {
      id: "checkpoint",
      dest: "Checkpoint",
      flag: "checkpoint",
      aliases: [],
      sectors: [],
      body: "Rock & <Stone>",
      prices: [{ id: "bribe", k: "scrap", lo: 10, hi: 15 }],
      bands: [{ id: "extra", k: "fuel", lo: 3, hi: 5 }],
      choices: [{ id: "c:checkpoint:0", label: "Attack", fx: [{ k: "nothing" }] }],
    },
  ],
  lists: [{ id: "ember-list", entries: [{ id: "refugee", unique: true }] }],
  rewards: {
    scaling: [{ baseAmount: 15, sectorAmount: 6, difficultyAmount: 0 }],
    resources: [{ kind: "fuel", level: "LOW", min: 1, max: 3 }],
    rewards: [{ name: "fuel", resources: [{ name: "fuel", level: "LOW" }] }],
  },
  factions: [{ id: "rebel", chance: 50, min: 20, max: 30 }],
  empties: [
    {
      id: "ember-quiet",
      dest: "Ember quiet",
      sectors: ["Ember Reach"],
      texts: ["Still."],
      nebula: true,
    },
  ],
};

describe("hyperspace mod", () => {
  it("writes the loaded pack and reads it back", () => {
    const xml = emitMod(pack);
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<pack>/);
    assert.doesNotMatch(xml, /Base pack written from the loaded crew/);
    assert.match(xml, /<facts\/>/);
    assert.match(xml, /<pool>Ada Voss<\/pool>/);
    assert.match(xml, /<syllable>ka<\/syllable>/);
    assert.match(xml, /<desc>Health 100\. Shields &amp; doors\.<\/desc>/);
    assert.match(xml, /<cost>45<\/cost>/);
    assert.match(xml, /<desc>Installs as a system\.<\/desc>/);
    assert.match(xml, /<systemBlueprint name="shields">/);
    assert.match(xml, /<startPower>2<\/startPower>/);
    assert.match(xml, /<upgradeCost>/);
    assert.match(xml, /<systemBlueprint name="cradle">/);
    assert.match(xml, /<slot>kit<\/slot>/);
    assert.doesNotMatch(xml, /subSystem/);
    assert.doesNotMatch(xml, /<systemTune/);
    assert.match(xml, /<customStore id="store">/);
    assert.doesNotMatch(xml, /<storeBlueprint/);
    assert.match(xml, /<event name="checkpoint"/);
    assert.doesNotMatch(xml, /<eventBlueprint/);
    assert.match(xml, /<event load="refugee" unique="true"\/>/);
    assert.match(xml, /<rewards>/);
    assert.match(xml, /<rewardScaling>/);
    assert.match(xml, /<shipBlueprint name="rebel">\s*<surrender chance="50" min="20" max="30"\/>/);
    assert.deepEqual(packFromMod(xml), pack);
  });

  it("leaves empty lists and a false facts flag off the pack", () => {
    const xml = emitMod({
      weapons: pack.weapons,
      facts: false,
      names: { pool: [], syllables: [] },
      crew: [],
      events: [],
    });
    assert.match(xml, /<weaponBlueprint name="ember"/);
    assert.doesNotMatch(xml, /<facts/);
    assert.doesNotMatch(xml, /<names>/);
    assert.doesNotMatch(xml, /<crew>/);
    assert.doesNotMatch(xml, /<event /);
    assert.deepEqual(packFromMod(xml), { weapons: pack.weapons });
  });

  it("refuses a campaign file", () => {
    assert.throws(() => packFromMod(`<FTL><weaponBlueprint name="ember"/></FTL>`), /Campaign XML/);
  });

  it("refuses a hyperspace extension file", () => {
    assert.throws(
      () =>
        packFromMod(`<hyperspace><crew><race name="human"><hp>100</hp></race></crew></hyperspace>`),
      /Hyperspace extension XML/,
    );
  });

  it("refuses a document with another root", () => {
    assert.throws(() => packFromMod(`<mods/>`), /starts with <pack>/);
  });

  it("refuses xml that is not well-formed", () => {
    assert.throws(() => packFromMod(`<pack>`), /not well-formed/);
  });
});

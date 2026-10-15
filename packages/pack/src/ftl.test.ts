import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { joinFtlPack, packFromFtl } from "./ftl.ts";

const BASE = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>Ember</title>
    <tooltip>One bolt.</tooltip>
    <damage>1</damage>
    <shots>3</shots>
    <sp>1</sp>
    <fireChance>10</fireChance>
    <breachChance>0</breachChance>
    <cooldown>11</cooldown>
    <power>2</power>
    <cost>80</cost>
    <ion>0</ion>
  </weaponBlueprint>
  <weaponBlueprint name="MINI">
    <type>BEAM</type>
    <title>Mini</title>
    <desc>A short swipe.</desc>
    <damage>1</damage>
    <shots>1</shots>
    <cooldown>12</cooldown>
    <power>1</power>
    <cost>20</cost>
    <length>90</length>
    <speed>3</speed>
    <crewDamage>15</crewDamage>
  </weaponBlueprint>
  <weaponBlueprint name="FLAK">
    <type>BURST</type>
    <title>Scatter</title>
    <damage>1</damage>
    <shots>3</shots>
    <cooldown>10</cooldown>
    <power>2</power>
    <cost>65</cost>
  </weaponBlueprint>
  <weaponBlueprint name="DART">
    <type>MISSILE</type>
    <title>Dart</title>
    <damage>2</damage>
    <shots>1</shots>
    <missiles>1</missiles>
    <cooldown>10</cooldown>
    <power>1</power>
    <cost>38</cost>
  </weaponBlueprint>
  <augBlueprint name="FEED">
    <title>Re-loader</title>
    <desc>Weapons charge faster.</desc>
    <cost>40</cost>
  </augBlueprint>
  <droneBlueprint name="STRIKER">
    <title>Striker</title>
    <cost>50</cost>
  </droneBlueprint>
  <systemBlueprint name="shields">
    <title>Shields</title>
    <startPower>2</startPower>
    <upgradeCost>
      <level>100</level>
      <level>20</level>
    </upgradeCost>
    <cost>125</cost>
  </systemBlueprint>
  <systemBlueprint name="cloaking">
    <title>Cloaking</title>
    <startPower>1</startPower>
    <upgradeCost>
      <level>30</level>
    </upgradeCost>
    <cost>150</cost>
  </systemBlueprint>
  <systemBlueprint name="artillery_ember">
    <title>Ember Artillery</title>
    <cost>0</cost>
  </systemBlueprint>
  <shipBlueprint name="KESTREL">
    <class>Kestrel</class>
    <title>The Kestrel</title>
  </shipBlueprint>
  <eventBlueprint name="quiet">
    <title>Quiet</title>
    <text>Nothing happens.</text>
  </eventBlueprint>
</FTL>
`;

const OVERWRITE = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>Ember II</title>
    <tooltip>Two bolts.</tooltip>
    <damage>2</damage>
    <shots>2</shots>
    <cooldown>12</cooldown>
    <power>3</power>
    <cost>90</cost>
  </weaponBlueprint>
  <systemBlueprint name="shields">
    <title>Barrier</title>
    <startPower>1</startPower>
    <upgradeCost>
      <level>50</level>
    </upgradeCost>
    <cost>80</cost>
  </systemBlueprint>
</FTL>
`;

describe("packFromFtl", () => {
  it("reads the five blueprint catalogs and ignores the other tags", () => {
    const pack = packFromFtl([{ path: "data/blueprints.xml", xml: BASE }]);
    assert.equal(pack.crew, undefined);
    assert.equal(pack.hulls, undefined);
    assert.equal(pack.sectors, undefined);
    assert.equal(pack.stores, undefined);
    assert.equal(pack.events, undefined);

    const ember = pack.weapons?.find((row) => row.id === "EMBER");
    assert.ok(ember);
    assert.equal(ember.name, "Ember");
    assert.equal(ember.kind, "laser");
    assert.equal(ember.power, 2);
    assert.equal(ember.charge, 11);
    assert.equal(ember.shots, 3);
    assert.equal(ember.gap, 0);
    assert.equal(ember.damage, 1);
    assert.equal(ember.fire, 1);
    assert.equal(ember.pierce, 1);
    assert.equal(ember.price, 80);
    assert.equal(ember.blurb, "One bolt.");
    assert.equal(ember.ammo, false);

    const mini = pack.weapons?.find((row) => row.id === "MINI");
    assert.equal(mini?.lengthTiles, 2);
    assert.equal(mini?.speed, 3);
    assert.equal(mini?.crewDamage, 15);
    assert.equal(mini?.blurb, "A short swipe.");
    assert.equal(pack.weapons?.find((row) => row.id === "FLAK")?.kind, "flak");
    assert.equal(pack.weapons?.find((row) => row.id === "DART")?.ammo, true);

    assert.deepEqual(pack.augments, [
      { id: "FEED", name: "Re-loader", detail: "Weapons charge faster.", cost: 40 },
    ]);
    assert.deepEqual(pack.drones, [{ id: "STRIKER", name: "Striker", cost: 50 }]);

    assert.equal(pack.systems?.find((row) => row.id === "shields")?.slot, "sys");
    assert.equal(pack.systems?.find((row) => row.id === "cloaking")?.slot, "kit");
    assert.equal(pack.systems?.find((row) => row.id === "artillery_ember")?.slot, "kit");
    const tagged = packFromFtl([
      {
        path: "data/slot.xml",
        xml: `<?xml version="1.0"?>
<FTL>
  <facts/>
  <names>
    <pool>Ada Voss</pool>
    <syllable>ka</syllable>
  </names>
  <crewBlueprint name="plain">
    <title>Human</title>
    <desc>Health 100.</desc>
  </crewBlueprint>
  <systemBlueprint name="veil">
    <title>Cloak</title>
    <desc>Installs as a kit.</desc>
    <slot>kit</slot>
  </systemBlueprint>
</FTL>`,
      },
    ]);
    assert.equal(tagged.facts, true);
    assert.deepEqual(tagged.names, { pool: ["Ada Voss"], syllables: ["ka"] });
    assert.equal(tagged.crew?.find((row) => row.id === "plain")?.name, "Human");
    assert.equal(tagged.crew?.find((row) => row.id === "plain")?.detail, "Health 100.");
    assert.equal(tagged.systems?.find((row) => row.id === "veil")?.slot, "kit");
    assert.equal(tagged.systems?.find((row) => row.id === "veil")?.detail, "Installs as a kit.");
    assert.deepEqual(
      pack.tunes?.find((row) => row.id === "shields"),
      {
        id: "shields",
        start: 2,
        costs: [
          { level: 1, cost: 100 },
          { level: 2, cost: 20 },
        ],
      },
    );
  });

  it("lets a later file replace a blueprint with the same id", () => {
    const pack = packFromFtl([
      { path: "data/blueprints.xml", xml: BASE },
      { path: "data/dlcBlueprintsOverwrite.xml", xml: OVERWRITE },
    ]);
    const weapons = pack.weapons?.map((row) => row.id);
    assert.deepEqual(weapons, ["EMBER", "MINI", "FLAK", "DART"]);
    const ember = pack.weapons?.[0];
    assert.equal(ember?.name, "Ember II");
    assert.equal(ember?.price, 90);
    assert.equal(pack.systems?.find((row) => row.id === "shields")?.name, "Barrier");
    assert.deepEqual(pack.tunes?.find((row) => row.id === "shields")?.costs, [
      { level: 1, cost: 50 },
    ]);
    assert.equal(pack.systems?.find((row) => row.id === "shields")?.cost, 80);
  });

  it("names the file when the XML is not well-formed", () => {
    assert.throws(
      () => packFromFtl([{ path: "data/blueprints.xml", xml: "<weaponBlueprint>" }]),
      /data\/blueprints\.xml: pack XML is not well-formed/,
    );
  });

  it("reads crew identity and leaves combat stats at the neutral defaults", () => {
    const pack = packFromFtl([
      {
        path: "data/blueprints.xml",
        xml: `<?xml version="1.0"?>
          <FTL>
            <crewBlueprint name="human">
              <title>Human</title>
              <desc>No particular strengths.</desc>
              <cost>45</cost>
              <color><r>235</r></color>
            </crewBlueprint>
          </FTL>`,
      },
    ]);
    assert.deepEqual(pack.crew, [
      {
        id: "human",
        name: "Human",
        detail: "No particular strengths.",
        cost: 45,
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
    ]);
  });

  it("copies a weaponAnim time onto the weapon that names that art", () => {
    const pack = packFromFtl([
      {
        path: "data/blueprints.xml",
        xml: `<?xml version="1.0"?>
          <FTL>
            <weaponBlueprint name="BURST_2">
              <type>LASER</type>
              <title>Burst Laser II</title>
              <weaponArt>laser_burst_2</weaponArt>
              <shots>3</shots>
              <cooldown>12</cooldown>
            </weaponBlueprint>
            <weaponBlueprint name="LASER_1">
              <type>LASER</type>
              <title>Basic Laser</title>
              <weaponArt>laser_1</weaponArt>
              <shots>1</shots>
            </weaponBlueprint>
          </FTL>`,
      },
      {
        path: "data/animations.xml",
        xml: `<?xml version="1.0"?>
          <FTL>
            <weaponAnim name="laser_burst_2">
              <chargedFrame>4</chargedFrame>
              <fireFrame>6</fireFrame>
              <time>0.28</time>
            </weaponAnim>
            <weaponAnim name="laser_1">
              <chargedFrame>1</chargedFrame>
              <fireFrame>2</fireFrame>
            </weaponAnim>
          </FTL>`,
      },
    ]);
    assert.equal(pack.weapons?.find((row) => row.id === "BURST_2")?.gap, 0.28);
    assert.equal(pack.weapons?.find((row) => row.id === "LASER_1")?.gap, 0);
  });
});

describe("joinFtlPack", () => {
  it("keeps archive blueprints and overlays only the rules the archive cannot supply", () => {
    const archive = packFromFtl([
      {
        path: "data/blueprints.xml",
        xml: `<?xml version="1.0"?>
          <FTL>
            <weaponBlueprint name="BURST_2">
              <type>LASER</type>
              <title>Burst Laser II</title>
              <cost>80</cost>
              <cooldown>12</cooldown>
            </weaponBlueprint>
            <augBlueprint name="WEAPON_PREIGNITE">
              <title>Weapon Pre-igniter</title>
              <desc>Start each fight charged.</desc>
              <cost>120</cost>
            </augBlueprint>
            <crewBlueprint name="human">
              <title>Human</title>
              <desc>Well rounded.</desc>
              <cost>45</cost>
            </crewBlueprint>
            <systemBlueprint name="shields">
              <title>Shields</title>
              <startPower>2</startPower>
              <cost>125</cost>
            </systemBlueprint>
          </FTL>`,
      },
    ]);
    const joined = joinFtlPack(archive, {
      weapons: [
        {
          id: "BURST_2",
          name: "Copied",
          kind: "laser",
          power: 1,
          charge: 1,
          shots: 1,
          gap: 9,
          damage: 1,
          ion: 0,
          fire: 0,
          breach: 0,
          ammo: false,
          price: 1,
          blurb: "would wipe the archive row",
        },
      ],
      augments: [{ id: "WEAPON_PREIGNITE", name: "Copied", detail: "formula", cost: 1 }],
      crew: [
        {
          id: "human",
          name: "Person",
          detail: "rules blurb",
          cost: 1,
          hp: 70,
          move: 1,
          repair: 1,
          fight: 1,
          suffocate: 1,
          fireTaken: 1,
          bonusPower: 1,
          hasDeathExplosion: true,
          drainsOxygen: false,
          detectsLifeforms: false,
          resistsMindControl: false,
          lockdown: false,
          lockCooldown: 0,
          fireRepairMultiplier: 1,
        },
        {
          id: "plain",
          name: "Plain",
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
      ],
      stores: [
        {
          id: "standard",
          name: "Store",
          slot: 3,
          weapons: 2,
          sections: ["weapons", "crew"],
          lines: [
            { id: "fuel", kind: "fuel", name: "Fuel", cost: 3, min: 3, max: 7 },
            { id: "human", kind: "crew", name: "Person", cost: 1, min: 1, max: 1 },
          ],
        },
      ],
      hulls: [
        {
          id: "kestrel-a",
          cruiser: "Kestrel",
          layout: "A",
          name: "The Kestrel",
          quote: "",
          unlock: "",
          source: "",
          reactor: 8,
          fuel: 16,
          missiles: 8,
          parts: 0,
          systems: {},
          weapons: ["lineburst"],
          crew: [],
          kits: {},
          augments: [],
          unfitted: [],
        },
      ],
      tunes: [{ id: "shields", start: 9, costs: [{ level: 1, cost: 1 }] }],
    });

    assert.equal(joined.weapons?.find((row) => row.id === "BURST_2")?.price, 80);
    assert.equal(joined.weapons?.find((row) => row.id === "BURST_2")?.gap, 0);
    assert.equal(joined.augments?.[0]?.detail, "Start each fight charged.");
    assert.equal(joined.augments?.[0]?.cost, 120);
    const human = joined.crew?.find((row) => row.id === "human");
    assert.equal(human?.name, "Human");
    assert.equal(human?.detail, "Well rounded.");
    assert.equal(human?.cost, 45);
    assert.equal(human?.hp, 70);
    assert.equal(human?.bonusPower, 1);
    assert.equal(human?.hasDeathExplosion, true);
    assert.equal(
      joined.crew?.some((row) => row.id === "plain"),
      true,
    );
    assert.equal(joined.stores?.[0]?.lines[0]?.cost, 3);
    assert.equal(joined.stores?.[0]?.lines[1]?.name, "Human");
    assert.equal(joined.stores?.[0]?.lines[1]?.cost, 45);
    assert.equal(joined.hulls?.[0]?.id, "kestrel-a");
    assert.equal(joined.tunes?.find((row) => row.id === "shields")?.start, 2);
    assert.equal(joined.systems?.find((row) => row.id === "shields")?.cost, 125);
  });
});

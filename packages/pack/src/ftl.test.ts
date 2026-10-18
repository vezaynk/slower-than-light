import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { packFromFtl } from "./ftl.ts";
import { eventDef, hullDef, loadPack, resetPackForTests, sectorDef } from "./registry.ts";

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
    <pierce>9</pierce>
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
  <event name="quiet">
    <title>Quiet</title>
    <text>Nothing happens.</text>
  </event>
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

const TEXT = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_STANDARD_SPACE">Federation Space</text>
  <text name="sectorname_short_STANDARD_SPACE">Fed</text>
  <text name="ship_boss_class">Rebel Flagship</text>
  <text name="event_gift">A gift.</text>
  <text name="continue">Continue...</text>
</FTL>
`;

const KESTRAL = `X_OFFSET
0
Y_OFFSET
2
VERTICAL
0
ELLIPSE
350
220
-30
0
ROOM
0
14
2
1
2
ROOM
1
12
2
2
2
DOOR
14
3
0
1
1
DOOR
7
0
6
-1
0
`;

const ARCHIVE = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <shipBlueprint name="PLAYER_SHIP_EASY" layout="kestral" img="kestral">
    <class>Kestrel</class>
    <name>The Kestrel</name>
    <systemList>
      <pilot power="1" room="0" start="true"/>
      <drones power="2" room="1" start="false"/>
    </systemList>
    <weaponSlots>4</weaponSlots>
    <droneSlots>2</droneSlots>
    <weaponList count="2" missiles="8">
      <weapon name="MISSILES_2_PLAYER"/>
      <weapon name="LASER_BURST_3"/>
    </weaponList>
    <health amount="30"/>
    <maxPower amount="8"/>
    <crewCount amount="3" class="human"/>
  </shipBlueprint>
  <shipBlueprint name="NO_LAYOUT">
    <class>Skipped</class>
  </shipBlueprint>
  <shipBlueprint name="BOSS_1_EASY" layout="boss">
    <class id="ship_boss_class"/>
    <systemList>
      <artillery power="4" room="9" weapon="ARTILLERY_BOSS_1"/>
      <doors power="1" room="2" start="false"/>
    </systemList>
    <weaponList missiles="10" load="WEAPONS_BOSS"/>
    <health amount="9"/>
    <maxPower amount="7"/>
    <crewCount amount="2" max="3" class="random"/>
    <aug name="SLUG_GEL"/>
  </shipBlueprint>
  <sectorDescription name="STANDARD_SPACE" minSector="0" unique="false">
    <nameList>
      <name id="sectorname_STANDARD_SPACE" short="sectorname_short_STANDARD_SPACE"/>
    </nameList>
    <trackList>
      <track>civilian</track>
    </trackList>
    <startEvent>START_BEACON</startEvent>
    <event name="STORE" min="1" max="2"/>
    <rarityList>
      <blueprint name="human" rarity="3"/>
    </rarityList>
  </sectorDescription>
  <sectorDescription name="ROCK_SPACE">
    <nameList>
      <name id="sectorname_ROCK"/>
    </nameList>
  </sectorDescription>
  <event name="BOARDER_TEST">
    <text>Oh no enemies!</text>
    <boarders min="3" max="5" class="human"/>
    <ship load="PIRATE"/>
    <item_modify>
      <item type="drones" min="1" max="2"/>
    </item_modify>
    <damage amount="2"/>
    <modifyPursuit amount="-2"/>
    <weapon name="LASER_BURST_3"/>
  </event>
  <event name="GIFT">
    <text id="event_gift"/>
    <autoReward level="HIGH">weapon</autoReward>
    <choice hidden="true">
      <text id="continue"/>
      <event>
        <text>You found it.</text>
        <autoReward level="LOW">standard</autoReward>
        <ship load="STORE" hostile="false"/>
        <choice>
          <text>Climb</text>
          <event load="BOARDER_TEST"/>
        </choice>
      </event>
    </choice>
    <choice name="leave">
      <text>Leave</text>
      <event load="BOARDER_TEST">
        <ship load="PIRATE" hostile="true"/>
      </event>
    </choice>
  </event>
  <eventList name="STORE">
    <event name="STORE_A" unique="true"/>
    <event name="STORE_B"/>
  </eventList>
  <eventList name="LONE_SHUTTLE_WAIT">
    <event>
      <text>Unmanned.</text>
      <item_modify>
        <item type="fuel" min="1" max="1"/>
      </item_modify>
    </event>
  </eventList>
  <customStore id="store"/>
</FTL>
`;

const OVERWRITE_WORLD = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <shipBlueprint name="PLAYER_SHIP_EASY" layout="kestral_2" img="kestral">
    <class>Kestrel</class>
    <name>The Kestrel II</name>
    <health amount="30"/>
    <maxPower amount="10"/>
  </shipBlueprint>
  <sectorDescription name="STANDARD_SPACE" minSector="2" unique="true"/>
  <event name="BOARDER_TEST">
    <text>Still enemies.</text>
  </event>
</FTL>
`;

describe("packFromFtl", () => {
  it("reads the five blueprint catalogs and leaves stores out", () => {
    const pack = packFromFtl([{ path: "data/blueprints.xml", xml: BASE }]);
    assert.equal(pack.crew, undefined);
    assert.equal(pack.hulls, undefined);
    assert.equal(pack.sectors, undefined);
    assert.equal(pack.stores, undefined);
    assert.equal(pack.events?.length, 1);
    assert.equal(pack.events?.[0]?.id, "quiet");
    assert.equal(pack.events?.[0]?.dest, "Quiet");
    assert.equal(pack.events?.[0]?.body, "Nothing happens.");
    assert.equal(pack.events?.[0]?.flag, "quiet");

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
    assert.equal(mini?.pierce, undefined);
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
  <crewBlueprint name="human">
    <title>Human</title>
    <desc>Health 100.</desc>
  </crewBlueprint>
  <systemBlueprint name="cloaking">
    <title>Cloak</title>
    <desc>Installs as a kit.</desc>
    <slot>kit</slot>
  </systemBlueprint>
</FTL>`,
      },
    ]);
    assert.equal(tagged.facts, true);
    assert.deepEqual(tagged.names, { pool: ["Ada Voss"], syllables: ["ka"] });
    assert.equal(tagged.crew?.find((row) => row.id === "human")?.name, "Human");
    assert.equal(tagged.crew?.find((row) => row.id === "human")?.detail, "Health 100.");
    assert.equal(tagged.systems?.find((row) => row.id === "cloaking")?.slot, "kit");
    assert.equal(
      tagged.systems?.find((row) => row.id === "cloaking")?.detail,
      "Installs as a kit.",
    );
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

  it("reads the archive missile type MISSILES", () => {
    const pack = packFromFtl([
      {
        path: "data/blueprints.xml",
        xml: `<weaponBlueprint name="LETO">
          <type>MISSILES</type>
          <title>Leto</title>
          <damage>1</damage>
          <shots>1</shots>
          <missiles>1</missiles>
          <power>1</power>
          <cost>20</cost>
        </weaponBlueprint>`,
      },
    ]);
    assert.equal(pack.weapons?.find((row) => row.id === "LETO")?.kind, "missile");
    assert.equal(pack.weapons?.find((row) => row.id === "LETO")?.ammo, true);
  });

  it("reads archive ships, sectors, and events", () => {
    const pack = packFromFtl(
      [
        { path: "data/text_sectorname.xml", xml: TEXT },
        { path: "data/blueprints.xml", xml: ARCHIVE },
      ],
      [{ path: "data/kestral.txt", text: KESTRAL }],
    );
    assert.equal(pack.stores, undefined);
    assert.equal(pack.hulls?.map((row) => row.id).join(","), "PLAYER_SHIP_EASY,BOSS_1_EASY");

    const kestrel = pack.hulls?.[0];
    assert.equal(kestrel?.layout, "kestral");
    assert.equal(kestrel?.img, "kestral");
    assert.equal(kestrel?.cruiser, "Kestrel");
    assert.equal(kestrel?.name, "The Kestrel");
    assert.equal(kestrel?.health, 30);
    assert.equal(kestrel?.reactor, 8);
    assert.equal(kestrel?.missiles, 8);
    assert.equal(kestrel?.parts, 0);
    assert.equal(kestrel?.fuel, 0);
    assert.equal(kestrel?.weaponSlots, 4);
    assert.equal(kestrel?.droneSlots, 2);
    assert.deepEqual(kestrel?.weapons, ["MISSILES_2_PLAYER", "LASER_BURST_3"]);
    assert.deepEqual(kestrel?.systems, {});
    assert.deepEqual(kestrel?.kits, {});
    assert.deepEqual(kestrel?.crew, []);
    assert.deepEqual(kestrel?.crewCounts, [{ amount: 3, class: "human" }]);
    assert.deepEqual(kestrel?.installs?.[0], { id: "pilot", power: 1, room: 0, start: true });
    assert.equal(kestrel?.installs?.find((row) => row.id === "drones")?.start, false);
    assert.equal(kestrel?.grid?.x, 0);
    assert.equal(kestrel?.grid?.y, 2);
    assert.equal(kestrel?.grid?.vertical, 0);
    assert.deepEqual(kestrel?.grid?.ellipse, { w: 350, h: 220, x: -30, y: 0 });
    assert.deepEqual(kestrel?.grid?.rooms[0], { id: 0, x: 14, y: 2, w: 1, h: 2 });
    assert.deepEqual(kestrel?.grid?.doors[1], { x: 7, y: 0, a: 6, b: -1, vertical: 0 });

    const boss = pack.hulls?.[1];
    assert.equal(boss?.layout, "boss");
    assert.equal(boss?.grid, undefined);
    assert.equal(boss?.cruiser, "Rebel Flagship");
    assert.equal(boss?.weaponLoad, "WEAPONS_BOSS");
    assert.deepEqual(boss?.augments, ["SLUG_GEL"]);
    assert.equal(boss?.installs?.find((row) => row.id === "artillery")?.weapon, "ARTILLERY_BOSS_1");
    assert.equal(boss?.installs?.find((row) => row.id === "doors")?.start, false);
    assert.deepEqual(boss?.crewCounts, [{ amount: 2, max: 3, class: "random" }]);

    const sector = pack.sectors?.[0];
    assert.equal(sector?.id, "STANDARD_SPACE");
    assert.equal(sector?.name, "Federation Space");
    assert.equal(sector?.short, "Fed");
    assert.equal(sector?.group, "");
    assert.deepEqual(sector?.notes, []);
    assert.equal(sector?.minSector, 0);
    assert.equal(sector?.unique, false);
    assert.equal(sector?.startEvent, "START_BEACON");
    assert.deepEqual(sector?.tracks, ["civilian"]);
    assert.deepEqual(sector?.quotas?.[0], { id: "STORE", min: 1, max: 2 });
    assert.deepEqual(sector?.rarities, [{ id: "human", rarity: 3 }]);
    assert.equal(
      pack.events?.some((row) => row.id === "STORE"),
      false,
    );

    const untranslated = pack.sectors?.[1];
    assert.equal(untranslated?.name, "sectorname_ROCK");

    const boarders = pack.events?.find((row) => row.id === "BOARDER_TEST");
    assert.equal(boarders?.body, "Oh no enemies!");
    assert.equal(boarders?.dest, "BOARDER_TEST");
    assert.equal(boarders?.flag, "BOARDER_TEST");
    assert.deepEqual(boarders?.ship, { load: "PIRATE", hostile: true });
    assert.deepEqual(boarders?.boarders, { min: 3, max: 5, class: "human" });
    assert.deepEqual(boarders?.fx, [
      { k: "res", id: "parts", sign: 1, lo: 1, hi: 2 },
      { k: "hull", n: -2 },
      { k: "fleet", n: 2 },
    ]);
    assert.deepEqual(boarders?.grants, [{ kind: "weapon", id: "LASER_BURST_3" }]);

    const gift = pack.events?.find((row) => row.id === "GIFT");
    assert.equal(gift?.body, "A gift.");
    assert.equal(gift?.reward?.level, "HIGH");
    assert.equal(gift?.reward?.name, "weapon");
    const stay = gift?.choices[0];
    assert.equal(stay?.id, "0");
    assert.equal(stay?.hidden, true);
    assert.equal(stay?.label, "Continue...");
    assert.deepEqual(stay?.fx, [{ k: "note", text: "You found it." }]);
    assert.deepEqual(stay?.reward, { level: "LOW", name: "standard" });
    assert.deepEqual(stay?.ship, { load: "STORE", hostile: false });
    assert.equal(stay?.choices?.[0]?.label, "Climb");
    assert.deepEqual(stay?.choices?.[0]?.fx, [{ k: "goto", id: "BOARDER_TEST" }]);
    const leave = gift?.choices[1];
    assert.equal(leave?.id, "leave");
    assert.deepEqual(leave?.fx, [
      { k: "goto", id: "BOARDER_TEST" },
      { k: "fight", tier: "PIRATE" },
    ]);

    assert.deepEqual(pack.lists, [
      {
        id: "STORE",
        entries: [
          { id: "STORE_A", unique: true },
          { id: "STORE_B", unique: false },
        ],
      },
      {
        id: "LONE_SHUTTLE_WAIT",
        entries: [
          {
            id: "LONE_SHUTTLE_WAIT:0",
            unique: false,
            page: {
              id: "LONE_SHUTTLE_WAIT:0",
              dest: "LONE_SHUTTLE_WAIT:0",
              flag: "LONE_SHUTTLE_WAIT:0",
              aliases: [],
              sectors: [],
              body: "Unmanned.",
              choices: [],
              fx: [{ k: "res", id: "fuel", sign: 1, lo: 1, hi: 1 }],
            },
          },
        ],
      },
    ]);
    assert.equal(
      pack.events?.some((row) => row.id === "STORE_A"),
      false,
    );
  });

  it("lets a later file replace a ship, a sector, and an event", () => {
    const pack = packFromFtl([
      { path: "data/blueprints.xml", xml: ARCHIVE },
      { path: "data/dlcBlueprintsOverwrite.xml", xml: OVERWRITE_WORLD },
    ]);
    assert.equal(pack.hulls?.find((row) => row.id === "PLAYER_SHIP_EASY")?.name, "The Kestrel II");
    assert.equal(pack.hulls?.find((row) => row.id === "PLAYER_SHIP_EASY")?.layout, "kestral_2");
    assert.equal(pack.hulls?.find((row) => row.id === "PLAYER_SHIP_EASY")?.grid, undefined);
    assert.equal(pack.sectors?.find((row) => row.id === "STANDARD_SPACE")?.minSector, 2);
    assert.equal(pack.events?.find((row) => row.id === "BOARDER_TEST")?.body, "Still enemies.");
  });

  it("keeps the archive fields when the pack is loaded", () => {
    const pack = packFromFtl(
      [
        { path: "data/text_sectorname.xml", xml: TEXT },
        { path: "data/blueprints.xml", xml: ARCHIVE },
      ],
      [{ path: "data/kestral.txt", text: KESTRAL }],
    );
    loadPack(pack, "base");
    try {
      const hull = hullDef("PLAYER_SHIP_EASY");
      assert.equal(hull?.layout, "kestral");
      assert.equal(hull?.grid?.rooms.length, 2);
      assert.equal(hull?.installs?.[0]?.id, "pilot");
      assert.deepEqual(hull?.systems, {});
      const sector = sectorDef("STANDARD_SPACE");
      assert.deepEqual(sector?.notes, []);
      assert.equal(sector?.quotas?.[0]?.id, "STORE");
      assert.equal(eventDef("GIFT")?.reward?.name, "weapon");
      assert.equal(eventDef("GIFT")?.choices[0]?.choices?.[0]?.fx[0]?.k, "goto");
    } finally {
      resetPackForTests();
    }
  });

  it("names the file when the XML is not well-formed", () => {
    assert.throws(
      () => packFromFtl([{ path: "data/blueprints.xml", xml: "<weaponBlueprint>" }]),
      /data\/blueprints\.xml: pack XML is not well-formed/,
    );
  });
});

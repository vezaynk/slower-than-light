import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachTextLists, packFromFtl, pickOpening } from "./ftl.ts";
import { onPackWarning } from "./warnings.ts";
import {
  blueprintList,
  eventDef,
  hullDef,
  loadPack,
  openingLine,
  resetPackForTests,
  sectorDef,
  shipEventDef,
  textList,
} from "./registry.ts";

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
  <crewBlueprint name="human">
    <title>Human</title>
  </crewBlueprint>
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
    <choice>
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
  <blueprintList name="WEAPONS_BOSS">
    <name>ARTILLERY_BOSS_1</name>
    <name>ARTILLERY_BOSS_2</name>
  </blueprintList>
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
  it("reads a list's <event load> as that page, and a page's <store/>", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <event name="STORE_ENGI">
    <text>Engi wares.</text>
    <store/>
  </event>
  <event name="PIRATE">
    <text>Pirates.</text>
    <ship load="PIRATE" hostile="true"/>
  </event>
  <eventList name="HOSTILE_ENGI">
    <event load="PIRATE"/>
    <event load="STORE_ENGI"/>
  </eventList>
</FTL>
`;
    const pack = packFromFtl([{ path: "data/events.xml", xml }]);
    assert.deepEqual(pack.lists, [
      {
        id: "HOSTILE_ENGI",
        entries: [
          { id: "PIRATE", unique: false },
          { id: "STORE_ENGI", unique: false },
        ],
      },
    ]);
    assert.equal(pack.events?.find((row) => row.id === "STORE_ENGI")?.store, true);
    assert.equal(pack.events?.find((row) => row.id === "PIRATE")?.store, undefined);
  });

  it("colours sectors from the sectorType lists, with an OVERRIDE_ list replacing its base", () => {
    const xml = `<FTL>
  <sectorType name="CIVILIAN"><sector>CALM</sector></sectorType>
  <sectorType name="HOSTILE"><sector>RAID</sector></sectorType>
  <sectorType name="OVERRIDE_HOSTILE"><sector>RAID</sector><sector>RUIN</sector></sectorType>
  <sectorType name="NEBULA"><sector>MIST</sector></sectorType>
  <sectorType name="UNKNOWN"><sector>VOID</sector><sector>CALM</sector></sectorType>
  <sectorDescription name="CALM"/>
  <sectorDescription name="RAID"/>
  <sectorDescription name="RUIN"/>
  <sectorDescription name="MIST"/>
  <sectorDescription name="VOID"/>
</FTL>`;
    const pack = packFromFtl([{ path: "data/sector_data.xml", xml }]);
    const group = (id: string) => pack.sectors?.find((row) => row.id === id)?.group;
    assert.equal(group("CALM"), "civilian");
    assert.equal(group("RAID"), "hostile");
    assert.equal(group("RUIN"), "hostile");
    assert.equal(group("MIST"), "nebula");
    assert.equal(group("VOID"), "");
  });

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

  it("warns about a crewCount or droneList the game cannot read, and keeps loading", () => {
    const ship = (body: string) => [
      {
        path: "data/blueprints.xml",
        xml: `<FTL>
  <crewBlueprint name="human"><title>Human</title></crewBlueprint>
  <shipBlueprint name="ODD" layout="odd">${body}</shipBlueprint>
</FTL>`,
      },
    ];
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      // ftl.dat's ghost ships: no crew, no class, nothing to warn about.
      assert.equal(packFromFtl(ship(`<crewCount amount="0"/>`)).hulls?.[0]?.crewCounts, undefined);
      assert.deepEqual(warnings, []);
      assert.equal(packFromFtl(ship(`<crewCount amount="2"/>`)).hulls?.[0]?.crewCounts, undefined);
      assert.equal(
        packFromFtl(ship(`<crewCount class="human"/>`)).hulls?.[0]?.crewCounts,
        undefined,
      );
      assert.deepEqual(
        packFromFtl(ship(`<crewCount amount="1" max="2" class="ghost"/>`)).hulls?.[0]?.crewCounts,
        [{ amount: 1, max: 2, class: "ghost" }],
      );
      assert.equal(packFromFtl(ship(`<droneList load="DRONES_STANDARD"/>`)).hulls?.[0]?.parts, 0);
      // ftl.dat's BOSS_1: a droneList that names no drones needs no parts.
      assert.equal(packFromFtl(ship(`<droneList count="0" missiles="2"/>`)).hulls?.[0]?.parts, 0);
      assert.deepEqual(warnings, [
        "shipBlueprint ODD: a crewCount of 2 names no class; it is skipped.",
        "shipBlueprint ODD: a crewCount has no amount; it is skipped.",
        'shipBlueprint ODD: crewCount class "ghost" is not a crewBlueprint.',
        "shipBlueprint ODD: its droneList names drones but has no drones (parts) attribute; it carries 0 parts.",
      ]);
    } finally {
      restore();
    }
  });

  it("reads boardingAI as sabotage or invasion, and warns on anything else", () => {
    const ship = (body: string) => [
      {
        path: "data/blueprints.xml",
        xml: `<FTL><shipBlueprint name="ODD" layout="odd">${body}</shipBlueprint></FTL>`,
      },
    ];
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      assert.equal(
        packFromFtl(ship(`<boardingAI>sabotage</boardingAI>`)).hulls?.[0]?.boardingAI,
        "sabotage",
      );
      assert.equal(
        packFromFtl(ship(`<boardingAI>invasion</boardingAI>`)).hulls?.[0]?.boardingAI,
        "invasion",
      );
      const raid = packFromFtl(ship(`<boardingAI>raid</boardingAI>`)).hulls?.[0];
      assert.ok(raid);
      assert.equal(raid.boardingAI, undefined);
      const plain = packFromFtl(ship(``)).hulls?.[0];
      assert.ok(plain);
      assert.equal(plain.boardingAI, undefined);
      assert.deepEqual(warnings, [
        `shipBlueprint ODD: boardingAI "raid" is not sabotage or invasion; it is left unset.`,
      ]);
    } finally {
      restore();
    }
  });

  it("fills id text from the strings, and expands an event's text list", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const pack = packFromFtl([
        {
          path: "data/text_blueprints.xml",
          xml: `<FTL>
  <text name="weapon_GUN_title">Burst Laser I</text>
  <text name="weapon_GUN_desc">Fires two shots.</text>
  <text name="weapon_GUN_title" language="de">Salvenlaser I</text>
  <text name="crew_human">Human</text>
  <text name="calm_1">Nothing stirs.</text>
  <text name="calm_2">Quiet space.</text>
</FTL>`,
        },
        {
          path: "data/blueprints.xml",
          xml: `<FTL>
  <weaponBlueprint name="GUN"><type>LASER</type><title id="weapon_GUN_title"/><desc id="weapon_GUN_desc"/>
    <damage>1</damage><shots>2</shots><cooldown>10</cooldown><power>2</power><cost>60</cost></weaponBlueprint>
  <crewBlueprint name="human"><title id="crew_human"/></crewBlueprint>
</FTL>`,
        },
        {
          path: "data/events.xml",
          xml: `<FTL>
  <textList name="CALM"><text id="calm_1"/><text id="calm_2"/></textList>
  <event name="QUIET"><text load="CALM"/></event>
  <event name="LOST"><text load="NO_LIST"/></event>
</FTL>`,
        },
        {
          path: "data/text-de.xml",
          xml: `<FTL><textList name="CALM"><text>German line.</text></textList></FTL>`,
        },
      ]);
      // English wins; the translated row carries language="de".
      assert.equal(pack.weapons?.find((row) => row.id === "GUN")?.name, "Burst Laser I");
      assert.equal(pack.crew?.find((row) => row.id === "human")?.name, "Human");
      const quiet = pack.events?.find((row) => row.id === "QUIET");
      assert.equal(quiet?.body, "Nothing stirs.");
      assert.deepEqual(quiet?.texts, ["Nothing stirs.", "Quiet space."]);
      assert.equal(quiet?.openings, undefined);
      assert.deepEqual(pack.textLists?.find((row) => row.id === "CALM")?.lines, [
        { text: "Nothing stirs." },
        { text: "Quiet space." },
      ]);
      assert.equal(pack.events?.find((row) => row.id === "LOST")?.body, "");
      assert.deepEqual(warnings, [
        '<text load="NO_LIST"/> names no textList; that text is left out.',
      ]);
    } finally {
      restore();
    }
  });

  it("keeps a nested text list as one draw, then picks inside it", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const pack = packFromFtl([
        {
          path: "data/events.xml",
          xml: `<FTL>
  <textList name="FLAT"><text>A.</text><text>B.</text></textList>
  <textList name="WRAP"><text load="FLAT"/></textList>
  <textList name="INNER"><text>Left.</text><text>Right.</text></textList>
  <textList name="OUTER"><text>Near.</text><text load="INNER"/></textList>
  <textList name="LOOP"><text load="LOOP"/></textList>
  <textList name="GONE_REF"><text load="GONE"/></textList>
  <event name="WRAPPED"><text load="WRAP"/></event>
  <event name="PAGE"><text load="OUTER"/></event>
  <event name="MIXED"><text>Literal.</text><text load="OUTER"/></event>
  <event name="LOOPED"><text load="LOOP"/></event>
  <event name="MISSING"><text load="GONE_REF"/></event>
</FTL>`,
        },
        {
          path: "data/dlcEvents.xml",
          xml: `<FTL><textList name="INNER"><text>Left.</text><text>Later.</text></textList></FTL>`,
        },
        {
          path: "data/text-de.xml",
          xml: `<FTL><textList name="OUTER"><text>German.</text></textList></FTL>`,
        },
      ]);
      const list = (id: string) => pack.textLists?.find((row) => row.id === id)?.lines;
      assert.deepEqual(list("WRAP"), [{ load: "FLAT" }]);
      assert.deepEqual(list("OUTER"), [{ text: "Near." }, { load: "INNER" }]);
      assert.deepEqual(list("INNER"), [{ text: "Left." }, { text: "Later." }]);
      const wrapped = pack.events?.find((row) => row.id === "WRAPPED");
      assert.equal(wrapped?.body, "");
      assert.equal(wrapped?.texts, undefined);
      assert.deepEqual(wrapped?.openings, [{ load: "FLAT" }]);
      const page = pack.events?.find((row) => row.id === "PAGE");
      assert.deepEqual(page?.openings, [{ text: "Near." }, { load: "INNER" }]);
      const mixed = pack.events?.find((row) => row.id === "MIXED");
      assert.deepEqual(mixed?.openings, [{ text: "Literal." }, { load: "OUTER" }]);

      const rolls: number[] = [];
      const last = (n: number) => {
        rolls.push(n);
        return n - 1;
      };
      assert.equal(pickOpening(wrapped!.openings!, list, last), "B.");
      assert.deepEqual(rolls, [1, 2]);
      rolls.length = 0;
      assert.equal(pickOpening(page!.openings!, list, last), "Later.");
      assert.deepEqual(rolls, [2, 2]);
      rolls.length = 0;
      assert.equal(
        pickOpening(mixed!.openings!, list, (n) => {
          rolls.push(n);
          return 0;
        }),
        "Literal.",
      );
      assert.deepEqual(rolls, [2]);
      rolls.length = 0;
      assert.equal(pickOpening(mixed!.openings!, list, last), "Later.");
      assert.deepEqual(rolls, [2, 2, 2]);

      assert.equal(
        pickOpening(pack.events!.find((row) => row.id === "LOOPED")!.openings!, list, () => 0),
        "",
      );
      assert.equal(
        pickOpening(pack.events!.find((row) => row.id === "MISSING")!.openings!, list, () => 0),
        "",
      );
      assert.deepEqual(warnings, [
        "textList LOOP loads itself; the sentence is left blank.",
        '<text load="GONE"/> names no textList; that text is left out.',
      ]);

      loadPack(pack, "append");
      rolls.length = 0;
      assert.equal(textList("OUTER")?.lines[1] && "load" in textList("OUTER")!.lines[1]!, true);
      assert.equal(
        openingLine("PAGE", (n) => {
          rolls.push(n);
          return 0;
        }),
        "Near.",
      );
      assert.deepEqual(rolls, [2]);
      assert.equal(
        openingLine("NO_SUCH_PAGE", () => {
          throw new Error("rolled");
        }),
        undefined,
      );
    } finally {
      restore();
      resetPackForTests();
    }
  });

  it("keeps a text list the pack already has", () => {
    const pack = packFromFtl([
      {
        path: "data/events.xml",
        xml: `<FTL><textList name="KEEP"><text>Ours.</text></textList></FTL>`,
      },
    ]);
    attachTextLists(pack, [
      {
        path: "data/text_lists.xml",
        xml: `<FTL>
  <textList name="KEEP"><text>Theirs.</text></textList>
  <textList name="NEW"><text>Added.</text></textList>
  <event name="HOME"><text>Not attached.</text></event>
</FTL>`,
      },
    ]);
    assert.deepEqual(pack.textLists?.find((row) => row.id === "KEEP")?.lines, [{ text: "Ours." }]);
    assert.deepEqual(
      pack.textLists?.map((row) => row.id),
      ["KEEP", "NEW"],
    );
    assert.equal(pack.events, undefined);
  });

  it("reads a crew colorList, one list per layer", () => {
    const pack = packFromFtl([
      {
        path: "data/blueprints.xml",
        xml: `<FTL>
  <crewBlueprint name="human">
    <title>Human</title>
    <colorList>
      <layer><color r="255" g="214" b="170" a="1"/><color r="141" g="85" b="36" a="1"/></layer>
      <layer><color r="60" g="90" b="200" a="0.5"/><color r="bad" g="0" b="0" a="1"/></layer>
    </colorList>
  </crewBlueprint>
</FTL>`,
      },
    ]);
    assert.deepEqual(pack.crew?.find((row) => row.id === "human")?.colors, [
      [
        { r: 255, g: 214, b: 170, a: 1 },
        { r: 141, g: 85, b: 36, a: 1 },
      ],
      [{ r: 60, g: 90, b: 200, a: 0.5 }],
    ]);
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
    assert.deepEqual(pack.stores, [
      { id: "store", name: "store", slot: 3, weapons: 2, sections: [], lines: [] },
    ]);
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
    assert.equal(kestrel?.weaponSlots, 4);
    assert.equal(kestrel?.weaponCount, 2);
    assert.equal(kestrel?.droneSlots, 2);
    assert.deepEqual(kestrel?.weapons, ["MISSILES_2_PLAYER", "LASER_BURST_3"]);
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
    assert.equal(boss?.weaponCount, undefined);
    assert.deepEqual(pack.blueprints, [
      { id: "WEAPONS_BOSS", names: ["ARTILLERY_BOSS_1", "ARTILLERY_BOSS_2"] },
    ]);
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
    // Unnamed choices are scoped to their page, and nested ones to their parent.
    assert.equal(stay?.id, "GIFT:0");
    assert.equal(stay?.hidden, true);
    assert.equal(stay?.label, "Continue...");
    assert.deepEqual(stay?.fx, [{ k: "note", text: "You found it." }]);
    assert.deepEqual(stay?.reward, { level: "LOW", name: "standard" });
    assert.deepEqual(stay?.ship, { load: "STORE", hostile: false });
    assert.equal(stay?.choices?.[0]?.label, "Climb");
    assert.equal(stay?.choices?.[0]?.id, "GIFT:0:0");
    assert.deepEqual(stay?.choices?.[0]?.fx, [{ k: "goto", id: "BOARDER_TEST" }]);
    const leave = gift?.choices[1];
    assert.equal(leave?.id, "GIFT:1");
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
      const sector = sectorDef("STANDARD_SPACE");
      assert.deepEqual(sector?.notes, []);
      assert.equal(sector?.quotas?.[0]?.id, "STORE");
      assert.equal(eventDef("GIFT")?.reward?.name, "weapon");
      assert.equal(eventDef("GIFT")?.choices[0]?.choices?.[0]?.fx[0]?.k, "goto");
      assert.equal(hull?.weaponCount, 2);
      assert.deepEqual(blueprintList("WEAPONS_BOSS"), ["ARTILLERY_BOSS_1", "ARTILLERY_BOSS_2"]);
      assert.equal(blueprintList("NO_SUCH"), undefined);
    } finally {
      resetPackForTests();
    }
  });

  it("keeps auto_blueprint, asteroid, and choice boarders", () => {
    const pack = packFromFtl([
      {
        path: "data/events.xml",
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <event name="FIELD">
    <text>Field.</text>
    <ship load="PIRATE" auto_blueprint="LIST_A" asteroid="true"/>
    <choice>
      <text>Stay</text>
      <event>
        <boarders min="1" max="2" class="mantis"/>
        <ship load="STORE" hostile="false" auto_blueprint="LIST_B"/>
      </event>
    </choice>
    <choice>
      <text>Fight</text>
      <event>
        <ship load="PIRATE" hostile="true" auto_blueprint="LIST_A" asteroid="true"/>
      </event>
    </choice>
    <choice>
      <text>Quiet</text>
      <event>
        <boarders min="2" max="2"/>
      </event>
    </choice>
    <choice>
      <text>Plain</text>
      <event>
        <ship load="PIRATE" asteroid="false"/>
      </event>
    </choice>
  </event>
</FTL>`,
      },
    ]);
    const field = pack.events?.find((row) => row.id === "FIELD");
    assert.deepEqual(field?.ship, {
      load: "PIRATE",
      hostile: true,
      autoBlueprint: "LIST_A",
      asteroid: true,
    });
    assert.deepEqual(field?.choices[0]?.boarders, { min: 1, max: 2, class: "mantis" });
    assert.deepEqual(field?.choices[0]?.ship, {
      load: "STORE",
      hostile: false,
      autoBlueprint: "LIST_B",
    });
    assert.deepEqual(field?.choices[1]?.fx, [
      { k: "fight", tier: "PIRATE", asteroid: true, autoBlueprint: "LIST_A" },
    ]);
    assert.deepEqual(field?.choices[2]?.boarders, { min: 2, max: 2 });
    assert.deepEqual(field?.choices[2]?.fx, []);
    assert.deepEqual(field?.choices[3]?.fx, [{ k: "fight", tier: "PIRATE" }]);
  });

  it("stores a root ship event and a hostile ship that has no load", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const pack = packFromFtl([
        {
          path: "data/events_ships.xml",
          xml: `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <ship name="PIRATE" auto_blueprint="SHIPS_PIRATE">
    <crew count="2"/>
    <weaponOverride count="1"/>
    <surrender chance="0.5" min="3" max="4">
      <text>Hail.</text>
      <choice>
        <text>Take</text>
        <event>
          <text>Paid.</text>
          <ship hostile="false"/>
        </event>
      </choice>
    </surrender>
    <escape min="4" max="6" timer="2000">
      <text>Running.</text>
    </escape>
    <destroyed load="DESTROYED_DEFAULT"/>
    <deadCrew>
      <text>Crew gone.</text>
      <status>ignored</status>
    </deadCrew>
    <gotaway load="GONE">
      <text>Inline wins.</text>
    </gotaway>
  </ship>
  <ship auto_blueprint="NO_NAME"/>
  <ship name="  "/>
  <ship name="BARE"/>
  <ship name="PIRATE_BARE_ESCAPE">
    <escape min="1" max="2"/>
  </ship>
  <event name="NOLOAD">
    <text>No load.</text>
    <ship hostile="true"/>
    <choice>
      <text>Quiet</text>
      <event>
        <ship hostile="false"/>
      </event>
    </choice>
    <choice>
      <text>Yell</text>
      <event>
        <ship hostile="true"/>
      </event>
    </choice>
    <choice>
      <text>Drop</text>
      <event>
        <ship/>
      </event>
    </choice>
  </event>
</FTL>`,
        },
      ]);
      const pirate = pack.shipEvents?.find((row) => row.id === "PIRATE");
      assert.equal(pirate?.autoBlueprint, "SHIPS_PIRATE");
      assert.equal(pirate?.surrender?.chance, 0.5);
      assert.equal(pirate?.surrender?.min, 3);
      assert.equal(pirate?.surrender?.max, 4);
      assert.equal(pirate?.surrender?.page?.id, "PIRATE:surrender");
      assert.equal(pirate?.surrender?.page?.body, "Hail.");
      assert.equal(pirate?.surrender?.page?.choices[0]?.id, "PIRATE:surrender:0");
      assert.deepEqual(pirate?.surrender?.page?.choices[0]?.ship, { hostile: false });
      assert.equal(pirate?.surrender?.load, undefined);
      assert.equal(pirate?.escape?.chance, undefined);
      assert.equal(pirate?.escape?.timer, 2000);
      assert.equal(pirate?.escape?.min, 4);
      assert.equal(pirate?.escape?.max, 6);
      assert.equal(pirate?.escape?.page?.body, "Running.");
      assert.equal(pirate?.escape?.load, undefined);
      assert.equal(pirate?.destroyed?.load, "DESTROYED_DEFAULT");
      assert.equal(pirate?.destroyed?.page, undefined);
      assert.equal(pirate?.deadCrew?.page?.body, "Crew gone.");
      assert.equal(pirate?.deadCrew?.page?.fx, undefined);
      assert.equal(pirate?.deadCrew?.page?.alters, undefined);
      assert.equal(pirate?.deadCrew?.load, undefined);
      assert.deepEqual(warnings, [
        'A <status> type "" is not limit, divide, clear, or loss; it is skipped.',
      ]);
      assert.equal(pirate?.gotaway?.page?.body, "Inline wins.");
      assert.equal(pirate?.gotaway?.load, undefined);
      assert.deepEqual(
        pack.shipEvents?.map((row) => row.id),
        ["PIRATE", "BARE", "PIRATE_BARE_ESCAPE"],
      );
      assert.equal(pack.shipEvents?.find((row) => row.id === "BARE")?.autoBlueprint, undefined);
      assert.equal(
        pack.shipEvents?.find((row) => row.id === "PIRATE_BARE_ESCAPE")?.escape?.timer,
        undefined,
      );
      assert.equal(
        pack.shipEvents?.find((row) => row.id === "PIRATE_BARE_ESCAPE")?.escape?.chance,
        undefined,
      );
      assert.equal(
        pack.hulls?.find((row) => row.id === "PIRATE"),
        undefined,
      );
      const noload = pack.events?.find((row) => row.id === "NOLOAD");
      assert.deepEqual(noload?.ship, { hostile: true });
      assert.deepEqual(noload?.choices[0]?.ship, { hostile: false });
      assert.deepEqual(noload?.choices[0]?.fx, []);
      assert.deepEqual(noload?.choices[1]?.ship, { hostile: true });
      assert.deepEqual(noload?.choices[1]?.fx, []);
      assert.equal(noload?.choices[2]?.ship, undefined);
      assert.deepEqual(noload?.choices[2]?.fx, []);
      loadPack({ shipEvents: pack.shipEvents }, "append");
      try {
        const stored = shipEventDef("PIRATE");
        assert.equal(stored?.autoBlueprint, "SHIPS_PIRATE");
        assert.equal(stored?.surrender?.page?.body, "Hail.");
        stored!.surrender!.page!.body = "mutated";
        loadPack({ shipEvents: pack.shipEvents }, "append");
        assert.equal(shipEventDef("PIRATE")?.surrender?.page?.body, "Hail.");
        assert.notEqual(shipEventDef("PIRATE")?.surrender?.page, pirate?.surrender?.page);
      } finally {
        resetPackForTests();
      }
      assert.equal(shipEventDef("PIRATE"), undefined);
    } finally {
      restore();
    }
  });

  it("reads an event environment, including which ship a battery shoots", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const pack = packFromFtl([
        {
          path: "data/events.xml",
          xml: `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <event name="FIELD">
    <text>Field.</text>
    <environment type="asteroid"/>
    <ship load="PIRATE" hostile="true"/>
    <choice>
      <text>Stay</text>
      <event>
        <environment type="sun"/>
        <boarders min="1" max="1" class="human"/>
      </event>
    </choice>
    <choice>
      <text>Battery</text>
      <event>
        <environment type="PDS" target="all"/>
        <ship load="PIRATE" hostile="true"/>
      </event>
    </choice>
  </event>
  <event name="ODD">
    <text>Odd.</text>
    <environment type="vortex"/>
  </event>
  <event name="AIM">
    <text>Aim.</text>
    <environment type="PDS" target="station"/>
  </event>
</FTL>`,
        },
      ]);
      const field = pack.events?.find((row) => row.id === "FIELD");
      assert.deepEqual(field?.environment, { type: "asteroid" });
      assert.deepEqual(field?.choices[0]?.environment, { type: "sun" });
      assert.deepEqual(field?.choices[1]?.environment, { type: "PDS", target: "all" });
      assert.equal(pack.events?.find((row) => row.id === "ODD")?.environment, undefined);
      assert.equal(pack.events?.find((row) => row.id === "AIM")?.environment, undefined);
      assert.deepEqual(warnings, [
        'An <environment> type "vortex" is not asteroid, nebula, pulsar, sun, storm, or PDS; it is skipped.',
        'An <environment type="PDS"> target "station" is not player, enemy, or all; it is skipped.',
      ]);
    } finally {
      restore();
    }
  });

  it("keeps status, upgrade, crew loss, and augment removal in document order", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const pack = packFromFtl([
        {
          path: "data/events.xml",
          xml: `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <event name="CAP">
    <text>Cap.</text>
    <status type="limit" target="player" system="engines" amount="1"/>
    <status type="loss" target="enemy" system="weapons" amount="2"/>
    <status type="clear" target="player" system="engines" amount="100"/>
    <upgrade amount="1" system="reactor"/>
    <removeCrew>
      <clone>false</clone>
      <text>Gone.</text>
    </removeCrew>
    <remove name="STASIS_POD"/>
    <choice>
      <text>Half</text>
      <event>
        <status type="divide" target="player" system="shields" amount="2"/>
      </event>
    </choice>
  </event>
  <event name="MELT">
    <text>Melt.</text>
    <status type="melt" target="player" system="engines" amount="1"/>
    <status type="limit" target="station" system="engines" amount="1"/>
    <status type="limit" target="player" system="engine" amount="1"/>
  </event>
</FTL>`,
        },
      ]);
      const cap = pack.events?.find((row) => row.id === "CAP");
      assert.deepEqual(cap?.alters, [
        { k: "status", type: "limit", target: "player", system: "engines", amount: 1 },
        { k: "status", type: "loss", target: "enemy", system: "weapons", amount: 2 },
        { k: "status", type: "clear", target: "player", system: "engines", amount: 100 },
        { k: "upgrade", system: "reactor", amount: 1 },
        { k: "removeCrew", clone: false, text: "Gone." },
        { k: "remove", name: "STASIS_POD" },
      ]);
      assert.deepEqual(cap?.choices[0]?.alters, [
        { k: "status", type: "divide", target: "player", system: "shields", amount: 2 },
      ]);
      assert.equal(pack.events?.find((row) => row.id === "MELT")?.alters, undefined);
      assert.deepEqual(warnings, [
        'A <status> type "melt" is not limit, divide, clear, or loss; it is skipped.',
        'A <status> target "station" is not player or enemy; it is skipped.',
        'A <status> system "engine" is not one this ship uses; it is skipped.',
      ]);
      loadPack({ events: pack.events }, "append");
      assert.deepEqual(eventDef("CAP")?.alters, cap?.alters);
      assert.deepEqual(eventDef("CAP")?.choices[0]?.alters, cap?.choices[0]?.alters);
    } finally {
      restore();
      resetPackForTests();
    }
  });

  it("keeps quest, secret sector, and map marks in document order", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const pack = packFromFtl([
        {
          path: "data/events.xml",
          xml: `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <event name="MARKS">
    <text>Marks.</text>
    <img>map.png</img>
    <quest event="STASH"/>
    <distressBeacon/>
    <secretSector/>
    <repair/>
    <fleet/>
    <reveal_map/>
    <unlockShip id="1"/>
    <img>later.png</img>
    <choice>
      <text>Enter</text>
      <event>
        <secretSector/>
        <unlockShip id="0"/>
      </event>
    </choice>
  </event>
  <event name="BLANK">
    <text>Blank.</text>
    <quest/>
    <unlockShip id="-1"/>
    <unlockShip id="nope"/>
  </event>
</FTL>`,
        },
      ]);
      const marks = pack.events?.find((row) => row.id === "MARKS");
      assert.equal(marks?.img, "map.png");
      assert.deepEqual(marks?.marks, [
        { k: "quest", event: "STASH" },
        { k: "distressBeacon" },
        { k: "secretSector" },
        { k: "repair" },
        { k: "fleet" },
        { k: "revealMap" },
        { k: "unlockShip", id: 1 },
      ]);
      assert.deepEqual(marks?.choices[0]?.marks, [
        { k: "secretSector" },
        { k: "unlockShip", id: 0 },
      ]);
      assert.equal(pack.events?.find((row) => row.id === "BLANK")?.marks, undefined);
      assert.deepEqual(warnings, [
        "A <quest> has no event; it places nothing.",
        "An <unlockShip> id is not a whole number; it grants nothing.",
      ]);
    } finally {
      restore();
      resetPackForTests();
    }
  });

  it("keeps English strings and drops translation files", () => {
    const english = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_STANDARD_SPACE">Federation Space</text>
  <text name="sectorname_short_STANDARD_SPACE">Fed</text>
  <text name="only_german" language="de">Tagged German</text>
</FTL>`;
    const german = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_STANDARD_SPACE">German Space</text>
  <text name="sectorname_short_STANDARD_SPACE">Ger</text>
  <text name="only_german">German Only</text>
</FTL>`;
    const han = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_STANDARD_SPACE">Han Space</text>
  <text name="sectorname_short_STANDARD_SPACE">Han</text>
</FTL>`;
    const append = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_STANDARD_SPACE">Civil Space</text>
</FTL>`;
    const germanAppend = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_STANDARD_SPACE">Last German</text>
  <text name="only_german">Still German</text>
</FTL>`;
    const short = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_short_STANDARD_SPACE">Home</text>
</FTL>`;
    const sectors = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <sectorDescription name="STANDARD_SPACE">
    <nameList>
      <name id="sectorname_STANDARD_SPACE" short="sectorname_short_STANDARD_SPACE"/>
    </nameList>
  </sectorDescription>
  <sectorDescription name="ONLY_DE">
    <nameList>
      <name id="only_german"/>
    </nameList>
  </sectorDescription>
</FTL>`;
    const pack = packFromFtl([
      { path: "data/text-de.xml", xml: german },
      { path: "data/text_sectorname.xml", xml: english },
      { path: "data/blueprints.xml", xml: sectors },
      { path: "data/text-zh_Hans.xml", xml: han },
      { path: "data/text_sectorname.xml.append", xml: append },
      { path: "data/text-de.xml.append", xml: germanAppend },
      { path: "data/events.xml", xml: short },
    ]);
    const standard = pack.sectors?.find((row) => row.id === "STANDARD_SPACE");
    assert.equal(standard?.name, "Civil Space");
    assert.equal(standard?.short, "Home");
    assert.equal(pack.sectors?.find((row) => row.id === "ONLY_DE")?.name, "only_german");
  });

  it("keeps the civilian column title from the English string table", () => {
    const english = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_CIVILIAN_SECTOR">Civilian Sector</text>
  <text name="sectorname_short_ENGI_SECTOR">Engi Controlled</text>
</FTL>`;
    const han = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_CIVILIAN_SECTOR">平民星区</text>
  <text name="sectorname_short_ENGI_SECTOR">被控制</text>
</FTL>`;
    const sectors = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <sectorDescription name="STANDARD_SPACE">
    <nameList><name>Civilian (Starting) Sector</name></nameList>
  </sectorDescription>
  <sectorDescription name="ENGI_SECTOR">
    <nameList>
      <name id="sectorname_ENGI_SECTOR" short="sectorname_short_ENGI_SECTOR">Engi Controlled Sector</name>
    </nameList>
  </sectorDescription>
</FTL>`;
    const pack = packFromFtl([
      { path: "data/text-zh_Hans.xml", xml: han },
      { path: "data/text_sectorname.xml", xml: english },
      { path: "data/sector_data.xml", xml: sectors },
    ]);
    const standard = pack.sectors?.find((row) => row.id === "STANDARD_SPACE");
    const engi = pack.sectors?.find((row) => row.id === "ENGI_SECTOR");
    assert.equal(pack.civilianSectorTitle, "Civilian Sector");
    assert.equal(standard?.name, "Civilian (Starting) Sector");
    assert.equal(engi?.name, "Engi Controlled Sector");
    assert.equal(engi?.short, "Engi Controlled");
  });

  it("reads an offer from an ordinary document and uses the name as the flag", () => {
    const pack = packFromFtl([
      {
        path: "data/events.xml",
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <event name="stall">
    <title>Stall</title>
    <text>A counter.</text>
    <eventList name="trade">
      <event>
        <item_modify>
          <item type="missiles" min="-2" max="-1"/>
          <item type="fuel" min="3" max="5"/>
        </item_modify>
      </event>
    </eventList>
  </event>
</FTL>`,
      },
    ]);
    assert.deepEqual(pack.events, [
      {
        id: "stall",
        dest: "Stall",
        flag: "stall",
        aliases: [],
        sectors: [],
        body: "A counter.",
        choices: [],
        offers: [{ k: "trade", pay: "missiles", cost: [1, 2], get: "fuel", gain: [3, 5] }],
      },
    ]);
  });

  it("names the file when the XML is not well-formed", () => {
    assert.throws(
      () => packFromFtl([{ path: "data/blueprints.xml", xml: "<weaponBlueprint>" }]),
      /data\/blueprints\.xml: pack XML is not well-formed/,
    );
  });
});

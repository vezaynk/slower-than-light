import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createGame, step } from "../sim.ts";
import { citedCrewDamage, citedPierce } from "../wiki/cited-weapons.ts";
import { aimedBeamTiles, packBeamSeconds } from "./beams.ts";
import { augmentDef, crewDef, droneDef, hullDef, loadPack, parsePack, resetPackForTests, sectorDef, storeDef, systemDef, tuneDef, weaponDef } from "@stl/pack";
import type { Shot } from "../types.ts";

const XML = `
<FTL>
<!-- a mod fragment -->
<crew>
  <race name="ember">
    <title>Ember</title>
    <maxHealth>40</maxHealth>
    <moveSpeedMultiplier>1.1</moveSpeedMultiplier>
    <repairSpeed>0.5</repairSpeed>
    <damageMultiplier>1.4</damageMultiplier>
    <canSuffocate>false</canSuffocate>
    <suffocationModifier>0.25</suffocationModifier>
    <fireDamageMultiplier>0</fireDamageMultiplier>
    <fireRepairMultiplier>1.5</fireRepairMultiplier>
    <bonusPower>1</bonusPower>
    <hasDeathExplosion>true</hasDeathExplosion>
    <oxygenChangeSpeed>-0.5</oxygenChangeSpeed>
    <detectsLifeforms>true</detectsLifeforms>
    <resistsMindControl>true</resistsMindControl>
    <noClone>true</noClone>
    <powerEffect>
      <lockdown>true</lockdown>
      <cooldown>12</cooldown>
    </powerEffect>
  </race>
</crew>
<weaponBlueprint name="NEEDLE2">
  <type>LASER</type>
  <title>Needle II</title>
  <tooltip>A short bolt.</tooltip>
  <damage>3</damage>
  <shots>2</shots>
  <power>1</power>
  <cooldown>7</cooldown>
  <cost>20</cost>
  <fireChance>3</fireChance>
  <breachChance>1</breachChance>
  <ion>0</ion>
</weaponBlueprint>
<weaponBlueprint name="LONG">
  <type>BEAM</type>
  <title>Long</title>
  <damage>1</damage>
  <shots>1</shots>
  <power>2</power>
  <cooldown>10</cooldown>
  <length>90</length>
  <speed>4</speed>
  <crewDamage>12</crewDamage>
  <sp>1</sp>
</weaponBlueprint>
<weaponBlueprint name="SKIP">
  <title>No type</title>
</weaponBlueprint>
<augBlueprint name="ember">
  <title>Ember</title>
  <desc>A warm listing.</desc>
  <cost>15</cost>
  <rarity>1</rarity>
</augBlueprint>
<augBlueprint name="bare">
  <desc>Only a description.</desc>
</augBlueprint>
<augBlueprint>
  <title>No name</title>
  <cost>4</cost>
</augBlueprint>
<droneBlueprint name="emberdrone">
  <title>Ember Drone</title>
  <cost>15</cost>
  <power>2</power>
</droneBlueprint>
<droneBlueprint name="baredrone">
  <power>1</power>
</droneBlueprint>
<droneBlueprint>
  <title>No name</title>
  <cost>4</cost>
</droneBlueprint>
<systemBlueprint name="embersys">
  <title>Ember</title>
  <cost>15</cost>
  <slot>kit</slot>
  <maxPower>8</maxPower>
</systemBlueprint>
<systemBlueprint name="baresys">
  <cost>0</cost>
</systemBlueprint>
<systemBlueprint>
  <title>No name</title>
  <cost>4</cost>
  <slot>kit</slot>
</systemBlueprint>
<shipBlueprint name="emberhull" layout="B">
  <class>Ember Cruiser</class>
  <title>The Ember</title>
  <desc>A warm hull.</desc>
  <unlock>Find it.</unlock>
  <source>Ember page</source>
  <reactor>9</reactor>
  <fuel>4</fuel>
  <missiles>1</missiles>
  <parts>3</parts>
  <health amount="30"/>
  <systemList>
    <system name="shields">
      <level>2</level>
      <power>1</power>
      <maxPower>4</maxPower>
    </system>
  </systemList>
  <weaponList>
    <weapon>lineburst</weapon>
  </weaponList>
  <crewList>
    <crewMember kin="plain" room="p-pilot"/>
  </crewList>
  <kitList>
    <kit name="veil">
      <level>1</level>
      <power>0</power>
      <on>false</on>
      <loadout>
        <schematic>patch</schematic>
      </loadout>
    </kit>
  </kitList>
  <augmentList>
    <augment>zshield</augment>
  </augmentList>
  <unfitted>
    <item>Spare</item>
  </unfitted>
</shipBlueprint>
<shipBlueprint name="barehull">
  <reactor>0</reactor>
</shipBlueprint>
<shipBlueprint>
  <title>No name</title>
</shipBlueprint>
<sectorDescription name="embersector">
  <title>Ember Reach</title>
  <type>hostile</type>
  <note>A later column.</note>
  <note>Stores stay put.</note>
  <minSector>4</minSector>
</sectorDescription>
<sectorDescription name="baresector">
  <title></title>
</sectorDescription>
<sectorDescription>
  <title>No name</title>
</sectorDescription>
<storeBlueprint name="emberstore">
  <title>Ember</title>
  <slot>1</slot>
  <weapons>4</weapons>
  <section>crew</section>
  <section>relics</section>
  <stock id="fuel" kind="fuel" min="1" max="2">
    <title>Ember Fuel</title>
    <cost>4</cost>
  </stock>
  <stock id="bareline" min="2">
    <cost>5</cost>
  </stock>
  <minSector>4</minSector>
</storeBlueprint>
<storeBlueprint name="barestore">
  <title></title>
</storeBlueprint>
<storeBlueprint>
  <title>No name</title>
</storeBlueprint>
<systemTune name="embertune">
  <start>3</start>
  <upgrade level="1">7</upgrade>
  <upgrade level="0">60</upgrade>
  <minSector>4</minSector>
</systemTune>
<systemTune name="baretune">
  <title></title>
</systemTune>
<systemTune>
  <start>4</start>
</systemTune>
</FTL>
`;

afterEach(() => resetPackForTests());

describe("parsePack", () => {
  it("reads the crew, weapon, augment, drone, system, hull, sector, store, and tune tags this milestone stores", () => {
    const pack = parsePack(XML);
    assert.equal(pack.crew?.length, 1);
    assert.equal(pack.weapons?.length, 2);
    assert.equal(pack.augments?.length, 2);
    assert.equal(pack.drones?.length, 2);
    assert.equal(pack.systems?.length, 2);
    assert.equal(pack.hulls?.length, 2);
    assert.equal(pack.sectors?.length, 2);
    assert.equal(pack.stores?.length, 2);
    assert.equal(pack.tunes?.length, 2);
    loadPack(pack, "append");

    const ember = crewDef("ember");
    assert.equal(ember.name, "Ember");
    assert.equal(ember.hp, 40);
    assert.equal(ember.move, 1.1);
    assert.equal(ember.repair, 0.5);
    assert.equal(ember.fight, 1.4);
    assert.equal(ember.suffocate, 0.25);
    assert.equal(ember.fireTaken, 0);
    assert.equal(ember.fireRepairMultiplier, 1.5);
    assert.equal(ember.bonusPower, 1);
    assert.equal(ember.hasDeathExplosion, true);
    assert.equal(ember.drainsOxygen, true);
    assert.equal(ember.detectsLifeforms, true);
    assert.equal(ember.resistsMindControl, true);
    assert.equal(ember.lockdown, true);
    assert.equal(ember.lockCooldown, 12);

    const needle = weaponDef("NEEDLE2");
    assert.equal(needle?.kind, "laser");
    assert.equal(needle?.name, "Needle II");
    assert.equal(needle?.blurb, "A short bolt.");
    assert.equal(needle?.damage, 3);
    assert.equal(needle?.shots, 2);
    assert.equal(needle?.power, 1);
    assert.equal(needle?.charge, 7);
    assert.equal(needle?.price, 20);
    assert.equal(needle?.fire, 0.3);
    assert.equal(needle?.breach, 0.1);
    assert.equal(needle?.ammo, false);

    const beam = weaponDef("LONG");
    assert.equal(beam?.kind, "beam");
    assert.equal(beam?.power, 2);
    assert.equal(beam?.lengthTiles, 2);
    assert.equal(beam?.speed, 4);
    assert.equal(aimedBeamTiles("LONG"), 2);
    assert.equal(packBeamSeconds("LONG", 2), (2 * 45) / (4 * 16));
    const shot = { defId: "LONG", damage: 1, kind: "beam" } as Shot;
    assert.equal(citedCrewDamage(shot, 1), 12);
    assert.equal(citedPierce("LONG"), 1);
    assert.equal(weaponDef("SKIP"), undefined);

    const emberAug = augmentDef("ember");
    assert.equal(emberAug?.name, "Ember");
    assert.equal(emberAug?.detail, "A warm listing.");
    assert.equal(emberAug?.cost, 15);
    const bare = augmentDef("bare");
    assert.equal(bare?.name, "bare");
    assert.equal(bare?.detail, "Only a description.");
    assert.equal(bare?.cost, 0);

    const emberDrone = droneDef("emberdrone");
    assert.equal(emberDrone?.name, "Ember Drone");
    assert.equal(emberDrone?.cost, 15);
    const bareDrone = droneDef("baredrone");
    assert.equal(bareDrone?.name, "baredrone");
    assert.equal(bareDrone?.cost, 0);
    assert.equal(droneDef("No name"), undefined);

    const emberSys = systemDef("embersys");
    assert.equal(emberSys?.name, "Ember");
    assert.equal(emberSys?.cost, 15);
    assert.equal(emberSys?.slot, "kit");
    const bareSys = systemDef("baresys");
    assert.equal(bareSys?.name, "baresys");
    assert.equal(bareSys?.cost, 0);
    assert.equal(bareSys?.slot, "sys");
    assert.equal(systemDef("No name"), undefined);

    const emberHull = hullDef("emberhull");
    assert.equal(emberHull?.name, "The Ember");
    assert.equal(emberHull?.cruiser, "Ember Cruiser");
    assert.equal(emberHull?.layout, "B");
    assert.equal(emberHull?.quote, "A warm hull.");
    assert.equal(emberHull?.unlock, "Find it.");
    assert.equal(emberHull?.source, "Ember page");
    assert.equal(emberHull?.reactor, 9);
    assert.equal(emberHull?.fuel, 4);
    assert.equal(emberHull?.missiles, 1);
    assert.equal(emberHull?.parts, 3);
    assert.deepEqual(emberHull?.systems.shields, [2, 1]);
    assert.deepEqual(emberHull?.weapons, ["lineburst"]);
    assert.deepEqual(emberHull?.crew, [{ kin: "plain", room: "p-pilot" }]);
    assert.equal(emberHull?.kits.veil?.level, 1);
    assert.equal(emberHull?.kits.veil?.on, false);
    assert.deepEqual(emberHull?.kits.veil?.loadout, ["patch"]);
    assert.deepEqual(emberHull?.augments, ["zshield"]);
    assert.deepEqual(emberHull?.unfitted, ["Spare"]);
    const bareHull = hullDef("barehull");
    assert.equal(bareHull?.name, "barehull");
    assert.equal(bareHull?.layout, "A");
    assert.equal(bareHull?.cruiser, "");
    assert.equal(bareHull?.reactor, 0);
    assert.deepEqual(bareHull?.weapons, []);
    assert.deepEqual(bareHull?.crew, []);
    assert.equal(hullDef("No name"), undefined);

    const emberSector = sectorDef("embersector");
    assert.equal(emberSector?.name, "Ember Reach");
    assert.equal(emberSector?.group, "hostile");
    assert.deepEqual(emberSector?.notes, ["A later column.", "Stores stay put."]);
    const bareSector = sectorDef("baresector");
    assert.equal(bareSector?.name, "baresector");
    assert.equal(bareSector?.group, "");
    assert.deepEqual(bareSector?.notes, []);
    assert.equal(sectorDef("No name"), undefined);

    const emberStore = storeDef("emberstore");
    assert.equal(emberStore?.name, "Ember");
    assert.equal(emberStore?.slot, 1);
    assert.equal(emberStore?.weapons, 4);
    assert.deepEqual(emberStore?.sections, ["crew", "relics"]);
    assert.equal(emberStore?.lines[0]?.name, "Ember Fuel");
    assert.equal(emberStore?.lines[0]?.kind, "fuel");
    assert.equal(emberStore?.lines[0]?.cost, 4);
    assert.equal(emberStore?.lines[0]?.min, 1);
    assert.equal(emberStore?.lines[0]?.max, 2);
    assert.equal(emberStore?.lines[1]?.name, "bareline");
    assert.equal(emberStore?.lines[1]?.kind, "");
    assert.equal(emberStore?.lines[1]?.cost, 5);
    assert.equal(emberStore?.lines[1]?.min, 2);
    assert.equal(emberStore?.lines[1]?.max, 2);
    const bareStore = storeDef("barestore");
    assert.equal(bareStore?.name, "barestore");
    assert.equal(bareStore?.slot, 3);
    assert.equal(bareStore?.weapons, 2);
    assert.deepEqual(bareStore?.sections, []);
    assert.deepEqual(bareStore?.lines, []);
    assert.equal(storeDef("No name"), undefined);

    const emberTune = tuneDef("embertune");
    assert.equal(emberTune?.start, 3);
    assert.deepEqual(emberTune?.costs, [
      { level: 1, cost: 7 },
      { level: 0, cost: 60 },
    ]);
    const bareTune = tuneDef("baretune");
    assert.equal(bareTune?.start, 1);
    assert.deepEqual(bareTune?.costs, []);
    assert.equal(tuneDef("No name"), undefined);
    assert.equal(systemDef("embertune"), undefined);
  });

  it("a spawned ember takes no fire damage from the packed multiplier", () => {
    loadPack(parsePack(XML), "append");
    const g = createGame(1);
    const body = g.crew.find((member) => member.side === "player" && member.hp > 0);
    assert.ok(body);
    body.kin = "ember";
    body.hp = crewDef("ember").hp;
    body.maxHp = body.hp;
    const room = g.player.rooms.find((candidate) => candidate.id === body.room);
    assert.ok(room);
    room.fire = 2;
    step(g, 1);
    assert.equal(body.hp, 40);
    assert.equal(weaponDef("NEEDLE2")?.charge, 7);
  });
});

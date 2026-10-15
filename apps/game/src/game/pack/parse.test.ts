import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createGame, step } from "../sim.ts";
import { citedCrewDamage, citedPierce } from "../wiki/cited-weapons.ts";
import { aimedBeamTiles, packBeamSeconds } from "./beams.ts";
import { parsePack } from "./parse.ts";
import { augmentDef, crewDef, droneDef, loadPack, resetPackForTests, systemDef, weaponDef } from "./registry.ts";
import type { Shot } from "../types.ts";

const XML = `
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
`;

afterEach(() => resetPackForTests());

describe("parsePack", () => {
  it("reads the crew, weapon, augment, drone, and system tags this milestone stores", () => {
    const pack = parsePack(XML);
    assert.equal(pack.crew?.length, 1);
    assert.equal(pack.weapons?.length, 2);
    assert.equal(pack.augments?.length, 2);
    assert.equal(pack.drones?.length, 2);
    assert.equal(pack.systems?.length, 2);
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

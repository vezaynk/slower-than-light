import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { packFromFtl } from "./ftl.ts";

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

    assert.deepEqual(pack.augments, [{ id: "FEED", name: "Re-loader", detail: "Weapons charge faster.", cost: 40 }]);
    assert.deepEqual(pack.drones, [{ id: "STRIKER", name: "Striker", cost: 50 }]);

    assert.equal(pack.systems?.find((row) => row.id === "shields")?.slot, "sys");
    assert.equal(pack.systems?.find((row) => row.id === "cloaking")?.slot, "kit");
    assert.equal(pack.systems?.find((row) => row.id === "artillery_ember")?.slot, "kit");
    assert.deepEqual(pack.tunes?.find((row) => row.id === "shields"), {
      id: "shields",
      start: 2,
      costs: [
        { level: 1, cost: 100 },
        { level: 2, cost: 20 },
      ],
    });
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
    assert.deepEqual(pack.tunes?.find((row) => row.id === "shields")?.costs, [{ level: 1, cost: 50 }]);
    assert.equal(pack.systems?.find((row) => row.id === "shields")?.cost, 80);
  });

  it("names the file when the XML is not well-formed", () => {
    assert.throws(
      () => packFromFtl([{ path: "data/blueprints.xml", xml: "<weaponBlueprint>" }]),
      /data\/blueprints\.xml: pack XML is not well-formed/,
    );
  });
});

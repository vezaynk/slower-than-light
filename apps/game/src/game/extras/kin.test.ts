import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "../pack/base.ts";
import { crewDef } from "@stl/pack";
import { KIN, kinOf, type KinId } from "./kin.ts";

const IDS: KinId[] = [
  "human",
  "engi",
  "energy",
  "mantis",
  "slug",
  "rock",
  "anaerobic",
  "crystal",
];

describe("kin", () => {
  it("baseline health is the human row, 100, with no special multiplier", () => {
    const plain = kinOf("human");
    assert.equal(plain.hp, 100);
    assert.equal(plain.move, 1);
    assert.equal(plain.repair, 1);
    assert.equal(plain.fight, 1);
    assert.equal(plain.suffocate, 1);
    assert.equal(plain.fireTaken, 1);
    assert.equal(KIN.human, plain);
  });

  it("voidlung does not suffocate", () => {
    // Wiki page "Lanius": immune to suffocation. Wiki page "Oxygen": same.
    assert.equal(kinOf("anaerobic").suffocate, 0);
    assert.equal(kinOf("anaerobic").move, 0.85);
    assert.notEqual(kinOf("anaerobic").suffocate, kinOf("human").suffocate);
  });

  it("stone has more health and takes no fire", () => {
    // Wiki page "Rockmen": hitpoints 150, immune to fire. Wiki page "Fires": immune.
    const stone = kinOf("rock");
    assert.equal(stone.hp, 150);
    assert.equal(stone.fireTaken, 0);
    assert.equal(stone.move, 0.5);
  });

  it("shard takes half suffocation and spark has the low health row", () => {
    // Wiki page "Crystal": -50% suffocation damage, hitpoints 125, movement 80%.
    assert.equal(kinOf("crystal").suffocate, 0.5);
    assert.equal(kinOf("crystal").hp, 125);
    assert.equal(kinOf("crystal").move, 0.8);
    // Wiki page "Zoltans": hitpoints 70.
    assert.equal(kinOf("energy").hp, 70);
  });

  it("shell repairs twice as fast and hits half as hard; blade is the reverse trade", () => {
    // Wiki page "Engi" / Crew table: repair ×2, combat ×0.5.
    assert.equal(kinOf("engi").repair, 2);
    assert.equal(kinOf("engi").fight, 0.5);
    // Wiki page "Mantis": repair 50%, combat 150%, movement 120%.
    assert.equal(kinOf("mantis").repair, 0.5);
    assert.equal(kinOf("mantis").fight, 1.5);
    assert.equal(kinOf("mantis").move, 1.2);
  });

  it("gel matches the baseline row on these fields", () => {
    const gel = kinOf("slug");
    const plain = kinOf("human");
    assert.equal(gel.hp, plain.hp);
    assert.equal(gel.move, plain.move);
    assert.equal(gel.repair, plain.repair);
    assert.equal(gel.fight, plain.fight);
    assert.equal(gel.suffocate, plain.suffocate);
    assert.equal(gel.fireTaken, plain.fireTaken);
  });

  it("the loaded race copies the authored row", () => {
    const authored = kinOf("energy");
    const loaded = crewDef("energy");
    assert.equal(loaded.hp, authored.hp);
    assert.equal(loaded.move, authored.move);
    assert.equal(loaded.repair, authored.repair);
    assert.equal(loaded.fight, authored.fight);
    assert.equal(loaded.suffocate, authored.suffocate);
    assert.equal(loaded.fireTaken, authored.fireTaken);
    assert.equal(loaded.name, authored.name);
    assert.equal(loaded.bonusPower, 1);
    assert.equal(loaded.hasDeathExplosion, true);
    assert.equal(crewDef("anaerobic").drainsOxygen, true);
    assert.equal(crewDef("slug").detectsLifeforms, true);
    assert.equal(crewDef("slug").resistsMindControl, true);
    assert.equal(crewDef("crystal").lockdown, true);
    assert.equal(crewDef("crystal").lockCooldown, 50);
    assert.equal(crewDef("rock").fireRepairMultiplier, 1.67);
    assert.equal(crewDef("crystal").fireRepairMultiplier, 0.83);
    assert.equal(crewDef("human").bonusPower, 0);
    assert.notEqual(loaded, authored);
  });

  it("display names match the crew table", () => {
    assert.equal(kinOf("human").name, "Human");
    assert.equal(kinOf("engi").name, "Engi");
    assert.equal(kinOf("energy").name, "Zoltan");
    assert.equal(kinOf("mantis").name, "Mantis");
    assert.equal(kinOf("slug").name, "Slug");
    assert.equal(kinOf("rock").name, "Rock");
    assert.equal(kinOf("anaerobic").name, "Lanius");
    assert.equal(kinOf("crystal").name, "Crystal");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KIN, kinOf, type KinId } from "./kin.ts";

const IDS: KinId[] = [
  "plain",
  "shell",
  "spark",
  "blade",
  "gel",
  "stone",
  "voidlung",
  "shard",
];

describe("kin", () => {
  it("baseline health is the human row, 100, with no special multiplier", () => {
    const plain = kinOf("plain");
    assert.equal(plain.hp, 100);
    assert.equal(plain.move, 1);
    assert.equal(plain.repair, 1);
    assert.equal(plain.fight, 1);
    assert.equal(plain.suffocate, 1);
    assert.equal(plain.fireTaken, 1);
    assert.equal(KIN.plain, plain);
  });

  it("voidlung does not suffocate", () => {
    // Wiki page "Lanius": immune to suffocation. Wiki page "Oxygen": same.
    assert.equal(kinOf("voidlung").suffocate, 0);
    assert.notEqual(kinOf("voidlung").suffocate, kinOf("plain").suffocate);
  });

  it("stone has more health and takes no fire", () => {
    // Wiki page "Rockmen": hitpoints 150, immune to fire. Wiki page "Fires": immune.
    const stone = kinOf("stone");
    assert.equal(stone.hp, 150);
    assert.equal(stone.fireTaken, 0);
    assert.equal(stone.move, 0.5);
  });

  it("shard takes half suffocation and spark has the low health row", () => {
    // Wiki page "Crystal": -50% suffocation damage, hitpoints 125, movement 80%.
    assert.equal(kinOf("shard").suffocate, 0.5);
    assert.equal(kinOf("shard").hp, 125);
    assert.equal(kinOf("shard").move, 0.8);
    // Wiki page "Zoltans": hitpoints 70.
    assert.equal(kinOf("spark").hp, 70);
  });

  it("shell repairs twice as fast and hits half as hard; blade is the reverse trade", () => {
    // Wiki page "Engi" / Crew table: repair ×2, combat ×0.5.
    assert.equal(kinOf("shell").repair, 2);
    assert.equal(kinOf("shell").fight, 0.5);
    // Wiki page "Mantis": repair 50%, combat 150%, movement 120%.
    assert.equal(kinOf("blade").repair, 0.5);
    assert.equal(kinOf("blade").fight, 1.5);
    assert.equal(kinOf("blade").move, 1.2);
  });

  it("gel matches the baseline row on these fields", () => {
    const gel = kinOf("gel");
    const plain = kinOf("plain");
    assert.equal(gel.hp, plain.hp);
    assert.equal(gel.move, plain.move);
    assert.equal(gel.repair, plain.repair);
    assert.equal(gel.fight, plain.fight);
    assert.equal(gel.suffocate, plain.suffocate);
    assert.equal(gel.fireTaken, plain.fireTaken);
  });

  it("display names match the crew table", () => {
    assert.equal(kinOf("plain").name, "Human");
    assert.equal(kinOf("shell").name, "Engi");
    assert.equal(kinOf("spark").name, "Zoltan");
    assert.equal(kinOf("blade").name, "Mantis");
    assert.equal(kinOf("gel").name, "Slug");
    assert.equal(kinOf("stone").name, "Rock");
    assert.equal(kinOf("voidlung").name, "Lanius");
    assert.equal(kinOf("shard").name, "Crystal");
  });
});

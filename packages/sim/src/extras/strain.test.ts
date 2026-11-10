import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STRAIN, strainOf, type StrainId } from "./strain.ts";

const IDS: StrainId[] = ["calm", "even", "harsh"];

describe("strain", () => {
  it("maps each id onto the record", () => {
    for (const id of IDS) {
      assert.equal(strainOf(id), STRAIN[id]);
    }
  });

  it("player-facing names stay original", () => {
    assert.equal(strainOf("calm").name, "Calm");
    assert.equal(strainOf("even").name, "Even");
    assert.equal(strainOf("harsh").name, "Harsh");
    const banned = /easy|normal|hard/i;
    for (const id of IDS) {
      assert.equal(banned.test(id), false);
      assert.equal(banned.test(strainOf(id).name), false);
    }
  });

  it("encodes no numeric fields", () => {
    // Wiki page "Difficulty": no headings, no numbers. not stated.
    for (const id of IDS) {
      const row = strainOf(id);
      assert.deepEqual(Object.keys(row), ["name"]);
      for (const value of Object.values(row)) {
        assert.equal(typeof value, "string");
      }
    }
  });
});

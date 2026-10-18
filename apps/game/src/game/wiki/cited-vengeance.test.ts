import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VENGEANCE_CHANCE, VENGEANCE_SHOT, vengeanceFires } from "./cited-vengeance.ts";

describe("Crystal Vengeance shot", () => {
  it("uses a 10 percent chance", () => {
    assert.equal(VENGEANCE_CHANCE, 0.1);
  });

  it("records every shot field from the Crystal Vengeance bullet", () => {
    assert.deepEqual(Object.keys(VENGEANCE_SHOT), [
      "damage",
      "breach",
      "stunChance",
      "stunSeconds",
      "ignoresShields",
      "evasion",
      "defenseDrone",
    ]);
    assert.equal(VENGEANCE_SHOT.damage, 1);
    assert.equal(VENGEANCE_SHOT.breach, 0.1);
    assert.equal(VENGEANCE_SHOT.stunChance, 0.2);
    assert.equal(VENGEANCE_SHOT.stunSeconds, 3);
    assert.equal(VENGEANCE_SHOT.ignoresShields, true);
    assert.equal(VENGEANCE_SHOT.evasion, true);
    assert.equal(VENGEANCE_SHOT.defenseDrone, true);
  });

  it("fires only for a roll in [0, 0.1)", () => {
    assert.equal(vengeanceFires(0), true);
    assert.equal(vengeanceFires(0.05), true);
    assert.equal(vengeanceFires(0.1 - 1e-12), true);
    assert.equal(vengeanceFires(VENGEANCE_CHANCE), false);
    assert.equal(vengeanceFires(0.1), false);
    assert.equal(vengeanceFires(0.1 + 1e-12), false);
    assert.equal(vengeanceFires(-1e-12), false);
    assert.equal(vengeanceFires(1), false);
    assert.equal(vengeanceFires(Number.NaN), false);
  });
});

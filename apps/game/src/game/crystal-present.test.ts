import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { missileHitVariant, presentsAsWarhead } from "./interface-copy.ts";
import "./pack/base.ts";

describe("crystal shots are not drawn or heard as warheads", () => {
  it("skips the smoke, blast, and large missileHit for an ammo-less missile, including Heavy Crystal II", () => {
    for (const defId of [
      "CRYSTAL_BURST_1",
      "CRYSTAL_BURST_2",
      "CRYSTAL_HEAVY_1",
      "CRYSTAL_HEAVY_2",
    ]) {
      assert.equal(presentsAsWarhead({ kind: "missile", defId }), false, defId);
      assert.equal(missileHitVariant({ kind: "missile", defId, damage: 4 }), null, defId);
    }
    assert.equal(presentsAsWarhead({ kind: "missile", defId: "MISSILES_1" }), true);
    assert.equal(missileHitVariant({ kind: "missile", defId: "MISSILES_1", damage: 1 }), 0);
    assert.equal(missileHitVariant({ kind: "missile", defId: "MISSILES_BREACH", damage: 4 }), 1);
    // A fake flak pellet is kind missile on a flak gun. It is not a crystal.
    assert.equal(presentsAsWarhead({ kind: "missile", defId: "SHOTGUN" }), true);
    assert.equal(missileHitVariant({ kind: "missile", defId: "SHOTGUN", damage: 0 }), 0);
    // The anti-ship battery has no crystal row. Damage 3 is the large blast.
    assert.equal(missileHitVariant({ kind: "missile", damage: 3 }), 1);
    assert.equal(presentsAsWarhead({ kind: "laser", defId: "CRYSTAL_HEAVY_2" }), false);
  });
});

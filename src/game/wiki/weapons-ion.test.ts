import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ION_GAPS, ION_WEAPONS } from "./weapons-ion.ts";

const byId = Object.fromEntries(ION_WEAPONS.map((w) => [w.id, w]));

describe("ion weapons", () => {
  it("lists only the three unfitted ions", () => {
    assert.deepEqual(
      ION_WEAPONS.map((w) => w.id),
      ["ioncharger", "chainion", "bossion"],
    );
    assert.equal(byId.ioncharger.name, "Ion Charger");
    assert.equal(byId.chainion.name, "Chain Ion");
    assert.equal(byId.bossion.name, "Boss Ion");
    for (const w of ION_WEAPONS) {
      assert.equal(w.kind, "ion");
      assert.equal(w.ammo, false);
      assert.equal(w.fire, 0);
      assert.equal(w.breach, 0);
      assert.equal(w.gap, 0);
    }
  });

  it("records power, charge, ion, damage, and price", () => {
    assert.equal(byId.ioncharger.power, 2);
    assert.equal(byId.ioncharger.charge, 6);
    assert.equal(byId.ioncharger.ion, 1);
    assert.equal(byId.ioncharger.damage, 0);
    assert.equal(byId.ioncharger.price, 50);

    assert.equal(byId.chainion.power, 3);
    assert.equal(byId.chainion.charge, 14);
    assert.equal(byId.chainion.ion, 1);
    assert.equal(byId.chainion.damage, 0);
    assert.equal(byId.chainion.price, 55);

    assert.equal(byId.bossion.power, 3);
    assert.equal(byId.bossion.charge, 35);
    assert.equal(byId.bossion.ion, 1);
    assert.equal(byId.bossion.damage, 0);
    assert.equal(byId.bossion.price, 0);
  });

  it("keeps early fire and the chain profile off the weapon fields", () => {
    assert.equal(ION_GAPS.ioncharger.canFireEarly, true);
    assert.equal(ION_GAPS.ioncharger.maxShots, 3);
    assert.deepEqual(ION_GAPS.chainion.laterIon, [2, 3, 4]);
    assert.equal(ION_GAPS.chainion.secondsToFullChain, 56);
    assert.equal(ION_GAPS.bossion.chargeByLevel[1], 35);
    assert.equal(ION_GAPS.bossion.chargeByLevel[2], 28);
    assert.equal(ION_GAPS.bossion.chargeByLevel[3], 21);
  });
});

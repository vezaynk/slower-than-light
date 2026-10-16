import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ION_GAPS, ION_WEAPONS } from "./weapons-ion.ts";

const src = readFileSync(
  new URL("../../../../../packages/catalog/src/wiki/weapons-ion.ts", import.meta.url),
  "utf8",
);

const byId = Object.fromEntries(ION_WEAPONS.map((w) => [w.id, w]));

describe("ion weapons", () => {
  it("lists only the three unfitted ions", () => {
    assert.deepEqual(
      ION_WEAPONS.map((w) => w.id),
      ["ION_CHARGEGUN", "ION_CHAINGUN", "ARTILLERY_BOSS_4"],
    );
    assert.equal(byId.ION_CHARGEGUN.name, "Ion Charger");
    assert.equal(byId.ION_CHAINGUN.name, "Chain Ion");
    assert.equal(byId.ARTILLERY_BOSS_4.name, "Boss Ion");
    for (const w of ION_WEAPONS) {
      assert.equal(w.kind, "ion");
      assert.equal(w.ammo, false);
      assert.equal(w.fire, 0);
      assert.equal(w.breach, 0);
      assert.equal(w.gap, 0);
    }
  });

  it("records power, charge, ion, damage, and price", () => {
    assert.equal(byId.ION_CHARGEGUN.power, 2);
    assert.equal(byId.ION_CHARGEGUN.charge, 6);
    assert.equal(byId.ION_CHARGEGUN.ion, 1);
    assert.equal(byId.ION_CHARGEGUN.damage, 0);
    assert.equal(byId.ION_CHARGEGUN.price, 50);

    assert.equal(byId.ION_CHAINGUN.power, 3);
    assert.equal(byId.ION_CHAINGUN.charge, 14);
    assert.equal(byId.ION_CHAINGUN.ion, 1);
    assert.equal(byId.ION_CHAINGUN.damage, 0);
    assert.equal(byId.ION_CHAINGUN.price, 55);

    assert.equal(byId.ARTILLERY_BOSS_4.power, 3);
    assert.equal(byId.ARTILLERY_BOSS_4.charge, 35);
    assert.equal(byId.ARTILLERY_BOSS_4.ion, 1);
    assert.equal(byId.ARTILLERY_BOSS_4.damage, 0);
    assert.equal(byId.ARTILLERY_BOSS_4.price, 0);
  });

  it("keeps early fire and the chain profile off the weapon fields", () => {
    assert.equal(ION_GAPS.ION_CHARGEGUN.canFireEarly, true);
    assert.equal(ION_GAPS.ION_CHARGEGUN.maxShots, 3);
    assert.deepEqual(ION_GAPS.ION_CHAINGUN.laterIon, [2, 3, 4]);
    assert.equal(ION_GAPS.ION_CHAINGUN.secondsToFullChain, 56);
    assert.equal(byId.ION_CHAINGUN.ion, 1);
    assert.equal("chain" in byId.ION_CHAINGUN, false);
    assert.match(src, /WeaponDef has no chain field/);
    assert.equal(ION_GAPS.ARTILLERY_BOSS_4.chargeByLevel[1], 35);
    assert.equal(ION_GAPS.ARTILLERY_BOSS_4.chargeByLevel[2], 28);
    assert.equal(ION_GAPS.ARTILLERY_BOSS_4.chargeByLevel[3], 21);
  });
});

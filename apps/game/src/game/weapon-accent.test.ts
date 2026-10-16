import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHARGE_PIPS, weaponAccentHot } from "./sim.ts";
import type { WeaponInst } from "./types.ts";

function gun(defId: string, charge: number, loaded?: number): WeaponInst {
  return { uid: "w", defId, charge, loaded, enabled: true, autofire: false, target: null };
}

describe("weapon accents", () => {
  it("stays dark until the charge pips all read full", () => {
    const full = (CHARGE_PIPS - 0.5) / CHARGE_PIPS;
    assert.equal(weaponAccentHot(gun("LASER_BURST_1", 0)), false);
    assert.equal(weaponAccentHot(gun("LASER_BURST_1", 0.5)), false);
    assert.equal(weaponAccentHot(gun("LASER_BURST_1", full - 0.02)), false);
    assert.equal(weaponAccentHot(gun("LASER_BURST_1", full)), true);
    assert.equal(weaponAccentHot(gun("LASER_BURST_1", 1)), true);
  });

  it("stays lit while a charger holds a shot, even if the next one just started", () => {
    assert.equal(weaponAccentHot(gun("LASER_CHARGEGUN", 0, 0)), false);
    assert.equal(weaponAccentHot(gun("LASER_CHARGEGUN", 0.2, 0)), false);
    assert.equal(weaponAccentHot(gun("LASER_CHARGEGUN", 0, 1)), true);
    assert.equal(weaponAccentHot(gun("LASER_CHARGEGUN", 0.2, 2)), true);
    assert.equal(weaponAccentHot(gun("ION_CHARGEGUN", 0, 3)), true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LASER_GAPS, LASER_WEAPONS } from "./weapons-laser.ts";

const expected: Record<string, { power: number; charge: number; shots: number; damage: number; price: number }> = {
  burst1: { power: 2, charge: 11, shots: 2, damage: 1, price: 50 },
  burst3: { power: 4, charge: 19, shots: 5, damage: 1, price: 95 },
  heavypierce: { power: 2, charge: 10, shots: 1, damage: 2, price: 0 },
  heavy2: { power: 3, charge: 13, shots: 2, damage: 2, price: 65 },
  hullsmash: { power: 2, charge: 14, shots: 2, damage: 1, price: 55 },
  hullsmash2: { power: 3, charge: 15, shots: 3, damage: 1, price: 75 },
  chainlaser: { power: 2, charge: 16, shots: 2, damage: 1, price: 65 },
  vulcan: { power: 4, charge: 11.1, shots: 1, damage: 1, price: 95 },
  chargers: { power: 1, charge: 5.5, shots: 2, damage: 1, price: 0 },
  charger: { power: 2, charge: 6, shots: 2, damage: 1, price: 55 },
  charger2: { power: 3, charge: 5, shots: 4, damage: 1, price: 70 },
};

function gap(id: string): string {
  return LASER_GAPS.filter((row) => row.id === id)
    .map((row) => row.note)
    .join(" ");
}

describe("laser weapons", () => {
  for (const [id, row] of Object.entries(expected)) {
    it(`${id} power, charge, shots, damage, price`, () => {
      const weapon = LASER_WEAPONS.find((entry) => entry.id === id);
      assert.ok(weapon);
      assert.equal(weapon.power, row.power);
      assert.equal(weapon.charge, row.charge);
      assert.equal(weapon.shots, row.shots);
      assert.equal(weapon.damage, row.damage);
      assert.equal(weapon.price, row.price);
    });
  }

  it("does not refit lasers that already exist", () => {
    const names = new Set(LASER_WEAPONS.map((weapon) => weapon.name));
    for (const banned of ["Basic Laser", "Dual Lasers", "Burst Laser Mark II", "Heavy Laser Mark I"]) {
      assert.equal(names.has(banned), false);
    }
    assert.deepEqual(
      LASER_WEAPONS.map((weapon) => weapon.id),
      Object.keys(expected),
    );
  });

  it("keeps pierce, systemless hull damage, and charge profiles out of the weapon fields", () => {
    assert.match(gap("heavypierce"), /1 shield piercing/);
    assert.match(gap("hullsmash"), /2 \(to systemless rooms\)/);
    assert.match(gap("hullsmash2"), /2 \(to systemless rooms\)/);
    assert.match(gap("chainlaser"), /16s\/13s\/10s\/7s/);
    assert.match(gap("vulcan"), /11\.1s \/ 9\.1s \/ 7\.1s \/ 5\.1s \/ 3\.1s \/ 1\.1s/);
    assert.match(gap("chargers"), /5\.5 seconds per shot, up to 2 shots/);
    assert.match(gap("charger"), /6 seconds per shot, up to 2 shots/);
    assert.match(gap("charger2"), /5 seconds per shot, up to 4 shots/);
  });

  it("keeps Boss Laser out of the pool catalog", () => {
    assert.equal(LASER_WEAPONS.some((weapon) => weapon.id === "bosslaser"), false);
    const boss = gap("bosslaser");
    assert.equal(boss.includes("BLOCKED"), false);
    assert.match(boss, /artillery maximum is 4/);
    assert.match(boss, /not a Weapons-pool cost/);
    assert.match(boss, /flagship-weapons\.ts/);
    assert.match(boss, /does not emit a second WeaponDef/);
    assert.match(boss, /25s/);
  });
});

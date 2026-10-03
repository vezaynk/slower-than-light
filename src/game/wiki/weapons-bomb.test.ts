import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOMB_CREW, BOMB_GAPS, BOMB_WEAPONS } from "./weapons-bomb.ts";

const ROWS: Record<string, { name: string; power: number; charge: number; damage: number; price: number; crew: number }> = {
  smallbomb: { name: "Small Bomb", power: 1, charge: 13, damage: 2, price: 45, crew: 30 },
  breach1: { name: "Breach Bomb Mark I", power: 1, charge: 9, damage: 1, price: 0, crew: 30 },
  breach2: { name: "Breach Bomb Mark II", power: 2, charge: 17, damage: 3, price: 60, crew: 45 },
  ionbomb: { name: "Ion Bomb", power: 1, charge: 22, damage: 0, price: 55, crew: 0 },
  stunbomb: { name: "Stun Bomb", power: 1, charge: 17, damage: 0, price: 45, crew: 0 },
  healburst: { name: "Healing Burst", power: 1, charge: 18, damage: 0, price: 40, crew: 0 },
  repairburst: { name: "Repair Burst", power: 1, charge: 14, damage: 0, price: 40, crew: 0 },
  lockdown: { name: "Crystal Lockdown Bomb", power: 1, charge: 15, damage: 0, price: 45, crew: 0 },
};

describe("bomb weapons", () => {
  it("lists the bomb rows except Fire Bomb", () => {
    assert.deepEqual(
      BOMB_WEAPONS.map((weapon) => weapon.id),
      Object.keys(ROWS),
    );
    assert.equal(
      BOMB_WEAPONS.some((weapon) => weapon.name === "Fire Bomb"),
      false,
    );
  });

  for (const [id, row] of Object.entries(ROWS)) {
    it(`${id} power, charge, damage, price`, () => {
      const weapon = BOMB_WEAPONS.find((entry) => entry.id === id);
      assert.ok(weapon);
      assert.equal(weapon.name, row.name);
      assert.equal(weapon.kind, "bomb");
      assert.equal(weapon.ammo, true);
      assert.equal(weapon.power, row.power);
      assert.equal(weapon.charge, row.charge);
      assert.equal(weapon.damage, row.damage);
      assert.equal(weapon.price, row.price);
      assert.equal(typeof BOMB_GAPS[id], "string");
      assert.ok(BOMB_GAPS[id].length > 0);
      assert.equal(BOMB_CREW[id], row.crew);
    });
  }

  it("keeps Fire Bomb off the weapon list and stores its printed crew damage on cask", () => {
    assert.equal(BOMB_WEAPONS.some((weapon) => weapon.id === "cask"), false);
    assert.equal(BOMB_CREW.cask, 30);
    assert.match(BOMB_GAPS.healburst, /150/);
    assert.equal(BOMB_CREW.healburst, 0);
    assert.match(BOMB_GAPS.repairburst, /8 bars/);
    assert.equal(BOMB_CREW.repairburst, 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MISSILE_GAPS, MISSILE_WEAPONS } from "./weapons-missile.ts";

const expected: Record<
  string,
  {
    name: string;
    power: number;
    charge: number;
    shots: number;
    damage: number;
    fire: number;
    breach: number;
    price: number;
    blurb: string;
  }
> = {
  artemisEnemy: {
    name: "Artemis Missiles (enemy)",
    power: 2,
    charge: 10,
    shots: 1,
    damage: 2,
    fire: 0,
    breach: 0,
    price: 0,
    blurb: "",
  },
  hermes: {
    name: "Hermes Missile",
    power: 3,
    charge: 14,
    shots: 1,
    damage: 3,
    fire: 0.3,
    breach: 0,
    price: 45,
    blurb: "Standard but powerful missile.",
  },
  breachmissiles: {
    name: "Breach Missiles",
    power: 3,
    charge: 22,
    shots: 1,
    damage: 4,
    fire: 0.3,
    breach: 0.56,
    price: 65,
    blurb: "These missiles are designed to cause maximum destruction to ship hull armor.",
  },
  hullmissile: {
    name: "Hull Missile",
    power: 2,
    charge: 17,
    shots: 1,
    damage: 2,
    fire: 0,
    breach: 0.27,
    price: 65,
    blurb: "High hull damage plus a decent breach chance.",
  },
  swarmmissiles: {
    name: "Swarm Missiles",
    power: 2,
    charge: 7,
    shots: 3,
    damage: 1,
    fire: 0,
    breach: 0,
    price: 65,
    blurb: "If given time to prepare, the 'Swarm' launcher can replicate multiple warheads.",
  },
  pegasus: {
    name: "Pegasus Missile",
    power: 3,
    charge: 20,
    shots: 2,
    damage: 2,
    fire: 0.3,
    breach: 0,
    price: 60,
    blurb: "Creative missile design allows for two projectiles for the cost of one!",
  },
  bossmissile: {
    name: "Boss Missile",
    power: 4,
    charge: 28.75,
    shots: 3,
    damage: 1,
    fire: 0.3,
    breach: 0,
    price: 0,
    blurb: "",
  },
};

const byId = Object.fromEntries(MISSILE_WEAPONS.map((weapon) => [weapon.id, weapon]));

describe("missile weapons", () => {
  it("lists the missile rows except Leto and the player Artemis", () => {
    assert.deepEqual(
      MISSILE_WEAPONS.map((weapon) => weapon.id),
      Object.keys(expected),
    );
    assert.equal(MISSILE_WEAPONS.some((weapon) => weapon.id === "leto" || weapon.id === "artemis"), false);
    assert.equal(
      MISSILE_WEAPONS.some((weapon) => weapon.name === "Leto Missiles" || weapon.name === "Artemis Missiles"),
      false,
    );
  });

  for (const [id, row] of Object.entries(expected)) {
    it(`${id} matches the printed row`, () => {
      const weapon = byId[id];
      assert.ok(weapon);
      assert.equal(weapon.name, row.name);
      assert.equal(weapon.kind, "missile");
      assert.equal(weapon.ammo, true);
      assert.equal(weapon.power, row.power);
      assert.equal(weapon.charge, row.charge);
      assert.equal(weapon.shots, row.shots);
      assert.equal(weapon.gap, 0);
      assert.equal(weapon.damage, row.damage);
      assert.equal(weapon.ion, 0);
      assert.equal(weapon.fire, row.fire);
      assert.equal(weapon.breach, row.breach);
      assert.equal(weapon.price, row.price);
      assert.equal(weapon.blurb, row.blurb);
    });
  }

  it("describes how enemy Artemis differs from the player row", () => {
    const gap = MISSILE_GAPS.artemisEnemy;
    assert.match(gap.note, /Power 2 instead of 1/);
    assert.match(gap.note, /10 seconds instead of 11/);
    assert.equal(gap.playerPower, 1);
    assert.equal(gap.playerCharge, 11);
    assert.equal(gap.playerShots, 1);
    assert.equal(gap.playerDamage, 2);
    assert.equal(byId.artemisEnemy.power, 2);
    assert.equal(byId.artemisEnemy.charge, 10);
  });

  it("keeps split damage, swarm aim, and boss charge times out of the weapon fields", () => {
    assert.equal(MISSILE_GAPS.hullmissile.systemlessDamage, 4);
    assert.equal(MISSILE_GAPS.hullmissile.countedAsMissileInEvents, false);
    assert.equal(MISSILE_GAPS.swarmmissiles.minShots, 1);
    assert.equal(MISSILE_GAPS.swarmmissiles.maxShots, 3);
    assert.equal(MISSILE_GAPS.swarmmissiles.radius, 31);
    assert.equal(MISSILE_GAPS.swarmmissiles.aim1x2MainPercent, 67.85);
    assert.equal(MISSILE_GAPS.swarmmissiles.aim1x2LongSidePercent, 8.04);
    assert.equal(MISSILE_GAPS.swarmmissiles.aim2x2MainPercent, 100);
    assert.equal(MISSILE_GAPS.swarmmissiles.oneMissilePerVolley, true);
    assert.equal(MISSILE_GAPS.pegasus.oneMissilePerVolley, true);
    assert.equal(MISSILE_GAPS.bossmissile.chargeByLevel[1], 28.75);
    assert.equal(MISSILE_GAPS.bossmissile.chargeByLevel[2], 23);
    assert.equal(MISSILE_GAPS.bossmissile.chargeByLevel[3], 17.25);
    assert.equal(MISSILE_GAPS.bossmissile.chargeByLevel[4], 11.5);
    assert.equal(MISSILE_GAPS.roll.fireBeforeBreach, true);
    assert.equal(MISSILE_GAPS.roll.stunPercentPrinted, false);
    assert.match(MISSILE_GAPS.breachmissiles.note, /killing a Zoltan/);
  });
});

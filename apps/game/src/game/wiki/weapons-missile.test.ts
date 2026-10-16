import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, createGame } from "../sim.ts";
import type { Shot } from "../types.ts";
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
  MISSILES_2: {
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
  MISSILES_3: {
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
  MISSILES_BREACH: {
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
  MISSILES_HULL: {
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
  MISSILE_CHARGEGUN: {
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
  MISSILES_BURST: {
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
  ARTILLERY_BOSS_2: {
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
    assert.equal(MISSILE_WEAPONS.some((weapon) => weapon.id === "MISSILES_1" || weapon.id === "MISSILES_2_PLAYER"), false);
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
    const gap = MISSILE_GAPS.MISSILES_2;
    assert.match(gap.note, /Power 2 instead of 1/);
    assert.match(gap.note, /10 seconds instead of 11/);
    assert.equal(gap.playerPower, 1);
    assert.equal(gap.playerCharge, 11);
    assert.equal(gap.playerShots, 1);
    assert.equal(gap.playerDamage, 2);
    assert.equal(byId.MISSILES_2.power, 2);
    assert.equal(byId.MISSILES_2.charge, 10);
  });

  it("keeps split damage, swarm aim, and boss charge times out of the weapon fields", () => {
    assert.equal(MISSILE_GAPS.MISSILES_HULL.systemlessDamage, 4);
    assert.equal(MISSILE_GAPS.MISSILES_HULL.countedAsMissileInEvents, false);
    assert.equal(MISSILE_GAPS.MISSILE_CHARGEGUN.minShots, 1);
    assert.equal(MISSILE_GAPS.MISSILE_CHARGEGUN.maxShots, 3);
    assert.equal(MISSILE_GAPS.MISSILE_CHARGEGUN.radius, 31);
    assert.equal(MISSILE_GAPS.MISSILE_CHARGEGUN.aim1x2MainPercent, 67.85);
    assert.equal(MISSILE_GAPS.MISSILE_CHARGEGUN.aim1x2LongSidePercent, 8.04);
    assert.equal(MISSILE_GAPS.MISSILE_CHARGEGUN.aim2x2MainPercent, 100);
    assert.equal(MISSILE_GAPS.MISSILE_CHARGEGUN.oneMissilePerVolley, true);
    assert.equal(MISSILE_GAPS.MISSILES_BURST.oneMissilePerVolley, true);
    assert.equal(MISSILE_GAPS.ARTILLERY_BOSS_2.chargeByLevel[1], 28.75);
    assert.equal(MISSILE_GAPS.ARTILLERY_BOSS_2.chargeByLevel[2], 23);
    assert.equal(MISSILE_GAPS.ARTILLERY_BOSS_2.chargeByLevel[3], 17.25);
    assert.equal(MISSILE_GAPS.ARTILLERY_BOSS_2.chargeByLevel[4], 11.5);
    assert.equal(MISSILE_GAPS.roll.fireBeforeBreach, true);
    assert.equal(MISSILE_GAPS.roll.stunPercentPrinted, false);
    assert.match(MISSILE_GAPS.MISSILES_BREACH.note, /killing a Zoltan/);
  });
});

function missileShot(partial: Partial<Shot> & Pick<Shot, "targetRoom">): Shot {
  return {
    id: "ms",
    kind: "missile",
    from: "enemy",
    damage: 1,
    ion: 0,
    fireChance: 0.3,
    breachChance: 0.56,
    wait: 0,
    t: 1,
    duration: 1,
    defId: "MISSILES_BREACH",
    ...partial,
  };
}

function quietRoom(seed: number): { g: ReturnType<typeof createGame>; roomId: string } {
  const g = createGame(seed);
  g.player.systems.engines.power = 0;
  g.player.shieldNow = 0;
  g.player.zoltan = 0;
  g.augments = g.augments.filter((id) => id !== "ROCK_ARMOR" && id !== "SYSTEM_CASING");
  const room = g.player.rooms.find((item) => item.system);
  if (!room) throw new Error("no system room");
  room.fire = 0;
  room.breach = 0;
  return { g, roomId: room.id };
}

describe("Missile fire or breach", () => {
  it("starts one or two fires and skips the breach when the fire roll hits", () => {
    let one = false;
    let two = false;
    for (let seed = 1; seed < 80 && !(one && two); seed++) {
      const { g, roomId } = quietRoom(seed);
      applyImpact(g, missileShot({ targetRoom: roomId, fireChance: 1, breachChance: 1 }));
      const room = g.player.rooms.find((item) => item.id === roomId);
      assert.ok(room);
      assert.equal(room.breach, 0);
      assert.ok(room.fire === 1 || room.fire === 2);
      if (room.fire === 1) one = true;
      if (room.fire === 2) two = true;
    }
    assert.equal(one, true);
    assert.equal(two, true);
  });

  it("breaches only after the fire roll fails", () => {
    const missed = quietRoom(1);
    applyImpact(missed.g, missileShot({ targetRoom: missed.roomId, fireChance: 0, breachChance: 1 }));
    const open = missed.g.player.rooms.find((item) => item.id === missed.roomId);
    assert.equal(open?.fire, 0);
    assert.ok((open?.breach ?? 0) > 0);

    let started = false;
    let failed = false;
    for (let seed = 1; seed < 200 && !(started && failed); seed++) {
      const { g, roomId } = quietRoom(seed);
      applyImpact(g, missileShot({ targetRoom: roomId, fireChance: 0.3, breachChance: 1 }));
      const room = g.player.rooms.find((item) => item.id === roomId);
      assert.ok(room);
      if (room.fire > 0) {
        assert.equal(room.breach, 0);
        started = true;
      } else if (room.breach > 0) failed = true;
    }
    assert.equal(started, true);
    assert.equal(failed, true);
  });

  it("still lets an environmental missile breach without the weapon's fire gate", () => {
    const { g, roomId } = quietRoom(1);
    applyImpact(
      g,
      missileShot({ targetRoom: roomId, from: "env", fireChance: 1, breachChance: 1, defId: undefined }),
    );
    const room = g.player.rooms.find((item) => item.id === roomId);
    assert.ok((room?.fire ?? 0) > 0);
    assert.ok((room?.breach ?? 0) > 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, createGame } from "../sim.ts";
import type { Game, Shot } from "../types.ts";
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

function laserShot(partial: Partial<Shot> & Pick<Shot, "targetRoom">): Shot {
  return {
    id: "hl",
    kind: "laser",
    from: "enemy",
    damage: 2,
    ion: 0,
    fireChance: 0.3,
    breachChance: 0.3,
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function bare(seed = 1): { g: Game; roomId: string } {
  const g = createGame(seed);
  g.player.systems.engines.power = 0;
  g.player.shieldNow = 0;
  g.player.zoltan = 0;
  g.augments = g.augments.filter((id) => id !== "keel" && id !== "casing");
  const room = g.player.rooms.find((item) => item.system);
  if (!room) throw new Error("no system room");
  room.fire = 0;
  room.breach = 0;
  return { g, roomId: room.id };
}

function marks(g: Game, roomId: string): { fire: number; breach: number } {
  const room = g.player.rooms.find((item) => item.id === roomId);
  if (!room) throw new Error("room gone");
  return { fire: room.fire, breach: room.breach };
}

describe("Heavy Laser fire then breach", () => {
  it("skips the breach roll when the fire roll starts a fire", () => {
    for (const defId of ["heavy", "heavy2", "heavypierce"]) {
      const { g, roomId } = bare();
      applyImpact(g, laserShot({ defId, targetRoom: roomId, fireChance: 1, breachChance: 1 }));
      const hit = marks(g, roomId);
      assert.ok(hit.fire > 0, defId);
      assert.equal(hit.breach, 0, defId);
    }
  });

  it("still breaches when the fire roll starts nothing", () => {
    const { g, roomId } = bare();
    applyImpact(g, laserShot({ defId: "heavy", targetRoom: roomId, fireChance: 0, breachChance: 1 }));
    const hit = marks(g, roomId);
    assert.equal(hit.fire, 0);
    assert.ok(hit.breach > 0);

    let started = false;
    let missed = false;
    for (let seed = 1; seed < 400 && !(started && missed); seed++) {
      const trial = bare();
      trial.g.seed = seed;
      applyImpact(
        trial.g,
        laserShot({ defId: "heavy", targetRoom: trial.roomId, fireChance: 0.3, breachChance: 0.3 }),
      );
      const next = marks(trial.g, trial.roomId);
      if (next.fire > 0) {
        assert.equal(next.breach, 0);
        started = true;
      } else if (next.breach > 0) missed = true;
    }
    assert.equal(started, true);
    assert.equal(missed, true);
  });

  it("still rolls both effects on a shot that is not a Heavy Laser", () => {
    const { g, roomId } = bare();
    applyImpact(g, laserShot({ defId: "burst2", targetRoom: roomId, fireChance: 1, breachChance: 1 }));
    const hit = marks(g, roomId);
    assert.ok(hit.fire > 0);
    assert.ok(hit.breach > 0);

    const surge = bare();
    applyImpact(
      surge.g,
      laserShot({ targetRoom: surge.roomId, fireChance: 1, breachChance: 1, label: "Surge" }),
    );
    const surgeHit = marks(surge.g, surge.roomId);
    assert.ok(surgeHit.fire > 0);
    assert.ok(surgeHit.breach > 0);
  });
});

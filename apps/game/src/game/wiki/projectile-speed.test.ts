import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadPack, resetPackForTests, weaponDef } from "@stl/pack";
import { createGame, startCombat, step } from "../sim.ts";
import {
  BOMB_FLIGHT_S,
  LASER_FLIGHT_S,
  LASER_SPEED,
  projectileFlightSeconds,
  shotFlightSeconds,
} from "./projectile-speed.ts";

describe("projectile speed", () => {
  it("keeps a speed-60 laser at 0.7s and scales the other printed speeds", () => {
    assert.equal(projectileFlightSeconds("LASER_BURST_3"), LASER_FLIGHT_S);
    assert.equal(projectileFlightSeconds("ARTILLERY_BOSS_1"), LASER_FLIGHT_S);
    assert.equal(projectileFlightSeconds("LASER_HULL_1"), (LASER_SPEED * LASER_FLIGHT_S) / 75);
    assert.equal(projectileFlightSeconds("LASER_HULL_2"), (LASER_SPEED * LASER_FLIGHT_S) / 90);
    assert.equal(projectileFlightSeconds("SHOTGUN"), (LASER_SPEED * LASER_FLIGHT_S) / 26);
    assert.equal(projectileFlightSeconds("flak-artillery"), (LASER_SPEED * LASER_FLIGHT_S) / 26);
    assert.equal(projectileFlightSeconds("ION_1"), (LASER_SPEED * LASER_FLIGHT_S) / 30);
    assert.equal(projectileFlightSeconds("ION_2"), (LASER_SPEED * LASER_FLIGHT_S) / 40);
    assert.equal(projectileFlightSeconds("ARTILLERY_BOSS_4"), (LASER_SPEED * LASER_FLIGHT_S) / 40);
    assert.equal(projectileFlightSeconds("MISSILES_2_PLAYER"), (LASER_SPEED * LASER_FLIGHT_S) / 35);
    assert.equal(projectileFlightSeconds("MISSILE_CHARGEGUN"), (LASER_SPEED * LASER_FLIGHT_S) / 45);
    assert.equal(projectileFlightSeconds("CRYSTAL_BURST_1"), (LASER_SPEED * LASER_FLIGHT_S) / 50);
    assert.equal(projectileFlightSeconds("dart"), null);
    assert.equal(shotFlightSeconds("bomb", "BOMB_FIRE"), BOMB_FLIGHT_S);
    assert.equal(shotFlightSeconds("missile", "dart"), BOMB_FLIGHT_S);
    assert.equal(projectileFlightSeconds("NOT_A_GUN"), null);
  });

  it("flies Flak Artillery from the archive id when the stand-in id has no speed", () => {
    const stand = weaponDef("flak-artillery");
    assert.ok(stand);
    assert.equal(stand.speed, 26);
    loadPack(
      {
        weapons: [
          { ...stand, speed: undefined },
          { ...stand, id: "ARTILLERY_FED_C", speed: 13 },
        ],
      },
      "append",
    );
    try {
      assert.equal(projectileFlightSeconds("flak-artillery"), (LASER_SPEED * LASER_FLIGHT_S) / 13);
      assert.equal(projectileFlightSeconds("ARTILLERY_FED_C"), (LASER_SPEED * LASER_FLIGHT_S) / 13);
    } finally {
      resetPackForTests();
    }
    loadPack({ weapons: [{ ...stand, speed: undefined }] }, "append");
    try {
      assert.equal(projectileFlightSeconds("flak-artillery"), (LASER_SPEED * LASER_FLIGHT_S) / 26);
      assert.equal(projectileFlightSeconds("ARTILLERY_FED_C"), (LASER_SPEED * LASER_FLIGHT_S) / 26);
    } finally {
      resetPackForTests();
    }
  });

  it("puts that flight on the shot the enemy fires", () => {
    const g = createGame(3);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    for (const w of g.player.weapons) w.enabled = false;
    g.enemy.reactor = 40;
    g.enemy.systems.weapons.level = 8;
    g.enemy.systems.weapons.damage = 0;
    g.enemy.ammo = 4;
    const expect: Record<string, number> = {
      LASER_HULL_2: (LASER_SPEED * LASER_FLIGHT_S) / 90,
      SHOTGUN: (LASER_SPEED * LASER_FLIGHT_S) / 26,
      MISSILES_1: (LASER_SPEED * LASER_FLIGHT_S) / 35,
      BOMB_FIRE: BOMB_FLIGHT_S,
      dart: BOMB_FLIGHT_S,
    };
    for (const [defId, duration] of Object.entries(expect)) {
      g.shots = [];
      g.enemy.weapons = [
        {
          uid: "gun",
          defId,
          charge: 1,
          enabled: true,
          autofire: true,
          target: g.player.rooms[0].id,
        },
      ];
      step(g, 0.05);
      const shots = g.shots.filter((shot) => shot.defId === defId);
      assert.ok(shots.length > 0, defId);
      for (const shot of shots) assert.equal(shot.duration, duration, defId);
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { weaponDef } from "@stl/pack";
import { applyImpact, createGame, evasionPercent, startCombat } from "../sim.ts";
import type { Game, Shot } from "../types.ts";
import "../pack/base.ts";
import {
  ARTILLERY_BEAM_PX,
  artillerySwipeSeconds,
  beamBodyTiles,
  beamSwipeSeconds,
  beamTileLength,
} from "./weapons-beam.ts";

function weaponDamage(id: string): number {
  const damage = weaponDef(id)?.damage;
  assert.notEqual(damage, undefined, id);
  return damage as number;
}

function beamShot(partial: Partial<Shot> & Pick<Shot, "damage">): Shot {
  return {
    id: "beam-tick",
    kind: "beam",
    from: "enemy",
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: partial.beamRooms?.[0] ?? "p-weapons",
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function quiet(seed = 4): Game {
  const g = createGame(seed);
  g.player.systems.engines.power = 0;
  g.player.shieldNow = 0;
  g.player.zoltan = 5;
  return g;
}

function systemDamage(g: Game, roomId: string): number {
  const room = g.player.rooms.find((item) => item.id === roomId);
  assert.ok(room?.system);
  return g.player.systems[room.system].damage;
}

describe("beam weapons", () => {
  it("stores printed crew-damage HP and leaves the dash and artillery beam out", () => {
    // 0 is a stored value. A missing blueprint field stays undefined. Pike is BEAM_LONG.
    assert.equal(weaponDef("BEAM_1")?.crewDamage, 15);
    assert.equal(weaponDef("BEAM_LONG")?.crewDamage, 15);
    assert.equal(weaponDef("BEAM_HULL")?.crewDamage, 15);
    assert.equal(weaponDef("BEAM_2")?.crewDamage, 30);
    assert.equal(weaponDef("BEAM_3")?.crewDamage, 45);
    assert.equal(weaponDef("BEAM_BIO")?.crewDamage, 60);
    assert.equal(weaponDef("BEAM_FIRE")?.crewDamage, undefined);
    assert.equal(weaponDef("ARTILLERY_BOSS_3")?.crewDamage, undefined);
    assert.equal(weaponDef("artillery-beam")?.crewDamage, undefined);
  });

  it("stores the printed tile lengths", () => {
    // Beam (Weapons): the parenthetical is the tile count. Pike Beam is BEAM_LONG.
    assert.equal(weaponDef("BEAM_1")?.lengthTiles, 1);
    assert.equal(weaponDef("BEAM_LONG")?.lengthTiles, 3.8);
    assert.equal(beamTileLength("BEAM_LONG"), 3.8);
    assert.equal(weaponDef("BEAM_HULL")?.lengthTiles, 2.2);
    assert.equal(weaponDef("BEAM_2")?.lengthTiles, 1.8);
    assert.equal(weaponDef("BEAM_3")?.lengthTiles, 1.8);
    assert.equal(weaponDef("BEAM_FIRE")?.lengthTiles, 3.1);
    assert.equal(weaponDef("BEAM_BIO")?.lengthTiles, 3.1);
    assert.equal(weaponDef("ARTILLERY_BOSS_3")?.lengthTiles, 2.2);
    assert.equal(beamTileLength("artillery-beam"), null);
    assert.equal(beamBodyTiles("BEAM_LONG"), 3.8);
    assert.equal(beamBodyTiles("artillery-beam"), ARTILLERY_BEAM_PX / 45);
  });

  it("times a swipe from the loaded blueprint speed", () => {
    // Data:WeaponDatabase.map. Speed 5 is 80 pixels per second. 45 pixels is one diagonal tile.
    // Artillery Beam is a shot label, not a blueprint. Its speed stays 13.
    assert.equal(weaponDef("BEAM_1")?.speed, 3);
    assert.equal(weaponDef("BEAM_LONG")?.speed, 9);
    assert.equal(weaponDef("BEAM_HULL")?.speed, 5);
    assert.equal(weaponDef("BEAM_2")?.speed, 5);
    assert.equal(weaponDef("BEAM_3")?.speed, 5);
    assert.equal(weaponDef("BEAM_FIRE")?.speed, 5);
    assert.equal(weaponDef("BEAM_BIO")?.speed, 30);
    assert.equal(weaponDef("ARTILLERY_BOSS_3")?.speed, 5);
    assert.equal(weaponDef("artillery-beam"), undefined);
    assert.equal(beamSwipeSeconds("BEAM_1", 1), 45 / (3 * 16));
    assert.equal(beamSwipeSeconds("BEAM_LONG", 3.8), (3.8 * 45) / (9 * 16));
    assert.equal(beamSwipeSeconds("BEAM_2", 1.8), (1.8 * 45) / (5 * 16));
    assert.equal(beamSwipeSeconds("BEAM_BIO", 3.1), (3.1 * 45) / (30 * 16));
    assert.equal(beamSwipeSeconds("ARTILLERY_BOSS_3", 2.2), (2.2 * 45) / (5 * 16));
    assert.equal(artillerySwipeSeconds(), ARTILLERY_BEAM_PX / (13 * 16));
    assert.equal(beamSwipeSeconds("BEAM_FIRE", 0), 0);
    assert.equal(beamSwipeSeconds(undefined, 1), null);
  });

  it("deals Glaive's printed damage through one shield and through two", () => {
    // Beam (Weapons), Glaive Beam: 2 damage per room through 1 shield, or 1 through 2. Layers stay up.
    function hit(layers: number) {
      const g = createGame(3);
      g.player.systems.engines.power = 0;
      g.player.zoltan = 0;
      // Shields, Overview: one barrier for every two powered levels. Two layers need four bars.
      g.player.systems.shields.level = layers * 2;
      g.player.systems.shields.power = layers * 2;
      g.player.shieldNow = layers;
      const hull = g.player.hull;
      applyImpact(
        g,
        beamShot({
          damage: weaponDamage("BEAM_3"),
          defId: "BEAM_3",
          beamRooms: ["p-weapons"],
          targetRoom: "p-weapons",
        }),
      );
      return {
        shields: g.player.shieldNow,
        system: systemDamage(g, "p-weapons"),
        hull: hull - g.player.hull,
      };
    }
    const one = hit(1);
    assert.equal(one.shields, 1);
    assert.equal(one.system, 2);
    assert.equal(one.hull, 2);
    const two = hit(2);
    assert.equal(two.shields, 2);
    assert.equal(two.system, 1);
    assert.equal(two.hull, 1);
  });

  function armed(level: number, power: number, layers: number): Game {
    const g = createGame(3);
    g.player.systems.engines.power = 0;
    g.player.zoltan = 0;
    g.player.systems.shields.level = level;
    g.player.systems.shields.power = power;
    g.player.systems.shields.damage = 0;
    g.player.shieldNow = layers;
    return g;
  }

  it("deals full damage to rooms entered after a Shields-2 hit drops the layer", () => {
    // Beam (Weapons), "Beam targeting and damage mechanics": damage is applied when the beam enters a room.
    // Shields, Overview: one barrier for every two powered bars. Halberd's 1 point through one layer
    // leaves a Shields-2 system with one bar, so the bubble is gone before the next room.
    const g = armed(2, 2, 1);
    const hull = g.player.hull;
    applyImpact(
      g,
      beamShot({
        damage: weaponDamage("BEAM_2"),
        defId: "BEAM_2",
        beamRooms: ["p-shields", "p-weapons", "p-engines"],
        targetRoom: "p-shields",
      }),
    );
    assert.equal(g.player.shieldNow, 0);
    assert.equal(g.player.systems.shields.damage, 1);
    assert.equal(systemDamage(g, "p-weapons"), 2);
    assert.equal(systemDamage(g, "p-engines"), 2);
    assert.equal(hull - g.player.hull, 5);
  });

  it("keeps the layer cut on rooms the beam already entered", () => {
    const g = armed(2, 2, 1);
    const hull = g.player.hull;
    applyImpact(
      g,
      beamShot({
        damage: weaponDamage("BEAM_2"),
        defId: "BEAM_2",
        beamRooms: ["p-weapons", "p-shields", "p-engines"],
        targetRoom: "p-weapons",
      }),
    );
    assert.equal(systemDamage(g, "p-weapons"), 1);
    assert.equal(g.player.systems.shields.damage, 1);
    assert.equal(g.player.shieldNow, 0);
    assert.equal(systemDamage(g, "p-engines"), 2);
    assert.equal(hull - g.player.hull, 4);
  });

  it("leaves the bubble up when one point of beam damage still leaves two shield bars", () => {
    // Shields-3 holds one layer and one buffer bar. The 1 point through that layer does not drop it.
    const g = armed(3, 2, 1);
    applyImpact(
      g,
      beamShot({
        damage: weaponDamage("BEAM_2"),
        defId: "BEAM_2",
        beamRooms: ["p-shields", "p-weapons"],
        targetRoom: "p-shields",
      }),
    );
    assert.equal(g.player.systems.shields.damage, 1);
    assert.equal(g.player.shieldNow, 1);
    assert.equal(systemDamage(g, "p-weapons"), 1);
  });

  it("drops one of two layers when the pierce damage hits Shields-4, then uses the layer that remains", () => {
    // Glaive deals 1 through two layers. That point takes Shields-4 from four bars to three, so one bubble remains.
    const g = armed(4, 4, 2);
    const hull = g.player.hull;
    applyImpact(
      g,
      beamShot({
        damage: weaponDamage("BEAM_3"),
        defId: "BEAM_3",
        beamRooms: ["p-shields", "p-weapons"],
        targetRoom: "p-shields",
      }),
    );
    assert.equal(g.player.systems.shields.damage, 1);
    assert.equal(g.player.shieldNow, 1);
    assert.equal(systemDamage(g, "p-weapons"), 2);
    assert.equal(hull - g.player.hull, 3);
  });

  it("does not pop a layer when every room's damage is cut to zero", () => {
    const g = armed(4, 4, 2);
    const hull = g.player.hull;
    applyImpact(
      g,
      beamShot({
        damage: weaponDamage("BEAM_2"),
        defId: "BEAM_2",
        beamRooms: ["p-shields", "p-weapons"],
        targetRoom: "p-shields",
      }),
    );
    assert.equal(g.player.shieldNow, 2);
    assert.equal(g.player.systems.shields.damage, 0);
    assert.equal(systemDamage(g, "p-weapons"), 0);
    assert.equal(g.player.hull, hull);
  });

  it("spends a Zoltan Shield at 33% and 80% of the path, once each", () => {
    const path = ["p-engines", "p-shields", "p-oxygen", "p-medbay"];
    const held = quiet();
    const hull = held.player.hull;
    applyImpact(
      held,
      beamShot({ damage: weaponDamage("BEAM_2"), defId: "BEAM_2", beamRooms: path }),
    );
    // Halberd: 2 damage times 2 instances. The bubble still has a point, so the hull is untouched.
    assert.equal(held.player.zoltan, 1);
    assert.equal(held.player.hull, hull);
    for (const id of path) assert.equal(systemDamage(held, id), 0);

    const fire = quiet();
    applyImpact(
      fire,
      beamShot({
        damage: weaponDamage("BEAM_FIRE"),
        defId: "BEAM_FIRE",
        fireChance: 1,
        beamRooms: path,
      }),
    );
    assert.equal(fire.player.zoltan, 3);
    assert.equal(fire.player.rooms.find((room) => room.id === "p-engines")?.fire ?? 0, 0);

    const anti = quiet();
    applyImpact(
      anti,
      beamShot({ damage: weaponDamage("BEAM_BIO"), defId: "BEAM_BIO", beamRooms: path }),
    );
    assert.equal(anti.player.zoltan, 3);
    assert.equal(anti.player.hull, hull);

    // The second tick is at 80%. A 2-point bubble pays both 1-damage instances and breaks there.
    // INFERRED equal slices: only the last quarter of a 4-room path is still ahead of 80%.
    const tail = quiet();
    tail.player.zoltan = 2;
    applyImpact(
      tail,
      beamShot({ damage: weaponDamage("BEAM_1"), defId: "BEAM_1", beamRooms: path }),
    );
    assert.equal(tail.player.zoltan, 0);
    assert.equal(systemDamage(tail, "p-engines"), 0);
    assert.equal(systemDamage(tail, "p-shields"), 0);
    assert.equal(systemDamage(tail, "p-oxygen"), 0);
    assert.equal(systemDamage(tail, "p-medbay"), 1);

    // Beam Drone 1 and Fire Drone have no second tick. The first tick breaks a 1-point bubble at 33%.
    const drone = quiet();
    drone.player.zoltan = 1;
    applyImpact(
      drone,
      beamShot({ damage: 1, defId: "COMBAT_BEAM", label: "drone:beam1", beamRooms: path }),
    );
    assert.equal(drone.player.zoltan, 0);
    assert.equal(systemDamage(drone, "p-engines"), 0);
    assert.equal(systemDamage(drone, "p-shields"), 1);

    const flame = quiet();
    flame.player.zoltan = 4;
    applyImpact(
      flame,
      beamShot({ damage: 1, defId: "fire", fireChance: 0.9, label: "drone:fire", beamRooms: path }),
    );
    assert.equal(flame.player.zoltan, 3);
    assert.equal(flame.player.hull, hull);
  });

  it("hits a ship that would dodge every other shot", () => {
    // Beam (Weapons) and Weapons, "Beams": "They are the only weapons that never miss."
    const g = createGame(3);
    startCombat(g, "scout");
    const ship = g.enemy;
    assert.ok(ship);
    ship.systems.engines.level = 8;
    ship.systems.engines.power = 8;
    ship.systems.engines.damage = 0;
    ship.systems.pilot.level = Math.max(1, ship.systems.pilot.level);
    ship.systems.pilot.damage = 0;
    ship.kits.cloaking = {
      id: "cloaking",
      level: 1,
      power: 1,
      left: 5,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
    };
    const engines = ship.rooms.find((r) => r.system === "engines");
    const pilot = ship.rooms.find((r) => r.system === "pilot");
    const crew = g.crew.filter((c) => c.aboard === "enemy" && c.hp > 0);
    if (engines && crew[0]) {
      crew[0].room = engines.id;
      crew[0].path = [];
    }
    if (pilot && crew[1]) {
      crew[1].room = pilot.id;
      crew[1].path = [];
    }
    assert.equal(evasionPercent(g, ship, "enemy"), 100);
    ship.shieldNow = 0;
    ship.zoltan = 0;
    const room = ship.rooms.find((r) => r.system === "weapons") ?? ship.rooms[0];
    assert.ok(room);
    const before = ship.hull;
    applyImpact(
      g,
      beamShot({
        damage: weaponDamage("BEAM_1"),
        from: "player",
        targetRoom: room.id,
        beamRooms: [room.id],
        defId: "BEAM_1",
      }),
    );
    assert.equal(ship.hull, before - 1);
    applyImpact(g, {
      ...beamShot({
        damage: weaponDamage("LASER_BURST_2_A"),
        from: "player",
        targetRoom: room.id,
        defId: "LASER_BURST_2_A",
      }),
      kind: "laser",
      beamRooms: undefined,
    });
    assert.equal(ship.hull, before - 1);
  });
});

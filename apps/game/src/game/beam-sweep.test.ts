import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, depowerWeapon, powerMask, startCombat, stepShots } from "./sim.ts";
import { hackHoldsWeapons } from "./extras/spike.ts";
import type { Shot } from "./types.ts";
import { powerGuns } from "./fixtures.ts";

/** A player beam across two enemy system rooms, no shields, fired from a powered mount. */
function sweep() {
  const g = createGame(3, "PLAYER_SHIP_HARD");
  startCombat(g, "scout");
  powerGuns(g);
  const enemy = g.enemy;
  assert.ok(enemy);
  enemy.shieldNow = 0;
  enemy.zoltan = 0;
  enemy.hull = 20;
  const rooms = enemy.rooms.filter((r) => r.system).slice(0, 2);
  assert.equal(rooms.length, 2);
  const w = g.player.weapons[0]!;
  const shot: Shot = {
    id: "beam",
    kind: "beam",
    from: "player",
    damage: 1,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: rooms[0]!.id,
    beamRooms: rooms.map((r) => r.id),
    defId: "BEAM_1",
    weapon: w.uid,
    wait: 0,
    t: 0,
    duration: 1,
  };
  g.shots = [shot];
  return { g, enemy, w, shot, rooms };
}

describe("beam sweep (per the user: damage lands as the beam touches each room)", () => {
  it("hits the first room at once and the second only when the beam reaches it", () => {
    const { g, enemy, shot } = sweep();
    stepShots(g, 0.1);
    assert.equal(enemy.hull, 19);
    stepShots(g, 0.3);
    assert.equal(enemy.hull, 19);
    stepShots(g, 0.2);
    assert.equal(enemy.hull, 18);
    assert.ok(g.shots.includes(shot));
    stepShots(g, 0.5);
    assert.equal(enemy.hull, 18);
    assert.equal(g.shots.length, 0);
  });

  it("stops dealing damage when shields come back up, and stays on the bubble until the swipe ends", () => {
    const { g, enemy, shot } = sweep();
    stepShots(g, 0.1);
    assert.equal(enemy.hull, 19);
    enemy.shieldNow = 1;
    stepShots(g, 0.1);
    assert.ok(shot.beamCut != null && Math.abs(shot.beamCut - 0.2) < 1e-9);
    enemy.shieldNow = 0;
    stepShots(g, 0.5);
    assert.equal(enemy.hull, 19);
    assert.ok(g.shots.includes(shot));
    stepShots(g, 0.5);
    assert.equal(g.shots.length, 0);
  });

  it("is blocked from the start when shields already cover it", () => {
    const { g, enemy, shot } = sweep();
    enemy.shieldNow = 1;
    stepShots(g, 0.01);
    assert.ok(shot.beamCut != null && shot.beamCut < 0.02);
    for (let i = 0; i < 10; i++) stepShots(g, 0.1);
    assert.equal(enemy.hull, 20);
  });

  it("stops firing when the mount goes offline", () => {
    const { g, enemy, w } = sweep();
    stepShots(g, 0.1);
    assert.equal(enemy.hull, 19);
    depowerWeapon(g, w.uid);
    stepShots(g, 0.1);
    assert.equal(g.shots.length, 0);
    stepShots(g, 0.5);
    assert.equal(enemy.hull, 19);
  });

  it("skips a room the beam leaves under a Zoltan Shield and hits the one it is in when the bubble breaks", () => {
    const { g, enemy } = sweep();
    // One beam instance (damage 1) breaks a 1-point bubble at 33%, inside the first room's half.
    enemy.zoltan = 1;
    stepShots(g, 0.2);
    assert.equal(enemy.hull, 20);
    stepShots(g, 0.2);
    assert.equal(enemy.zoltan, 0);
    assert.equal(enemy.hull, 19);
    stepShots(g, 0.6);
    assert.equal(enemy.hull, 18);

    const late = sweep();
    late.enemy.zoltan = 2;
    for (let i = 0; i < 10; i++) stepShots(late.g, 0.1);
    // 33% and 80% each take 1. The bubble breaks at 80%, inside the second room.
    assert.equal(late.enemy.zoltan, 0);
    assert.equal(late.enemy.hull, 19);
  });

  it("finishes a firing beam when a hacking pulse lands on the shooter's Weapons", () => {
    // Hacking, "Overview": Weapon Control "drains the charge of all weapons" and "prevents them from being fired".
    // A beam already firing has spent its charge, so the pulse does not stop it.
    const g = createGame(3, "PLAYER_SHIP_HARD");
    startCombat(g, "scout");
    powerGuns(g);
    const enemy = g.enemy;
    assert.ok(enemy);
    const w = enemy.weapons.find((_, i) => powerMask(enemy)[i]);
    assert.ok(w);
    g.player.shieldNow = 0;
    g.player.zoltan = 0;
    const hull = g.player.hull;
    const rooms = g.player.rooms.filter((r) => r.system).slice(0, 2);
    g.shots = [
      {
        id: "foe-beam",
        kind: "beam",
        from: "enemy",
        damage: 1,
        ion: 0,
        fireChance: 0,
        breachChance: 0,
        targetRoom: rooms[0]!.id,
        beamRooms: rooms.map((r) => r.id),
        defId: "BEAM_1",
        weapon: w.uid,
        wait: 0,
        t: 0,
        duration: 1,
      },
    ];
    stepShots(g, 0.1);
    assert.equal(g.player.hull, hull - 1);
    g.player.kits.hacking = {
      id: "hacking",
      level: 1,
      power: 1,
      left: 5,
      cool: 0,
      target: "weapons",
      on: true,
      aux: 0,
    };
    assert.equal(hackHoldsWeapons(g, "enemy"), true);
    stepShots(g, 0.5);
    assert.equal(g.player.hull, hull - 2);
  });
});

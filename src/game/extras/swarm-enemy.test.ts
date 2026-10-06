import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENEMY_RUNNABLE, SCHEMATIC_POWER, enemyParts, rollDrones } from "../enemy-gen.ts";
import { createGame, startCombat, step } from "../sim.ts";
import type { DroneUnit, Game } from "../types.ts";
import { ENEMY_DRONES } from "../wiki/enemy-ships.ts";
import {
  ACQUIRE_S,
  ANTI_STUN_S,
  BOARD_FLY_S,
  DRONE_COOLDOWN_S,
  DRONE_LABEL,
  DRONE_POWER,
  REDEPLOY_S,
  deploy,
  enemyDefenseIntercept,
  interceptIncomingDrone,
  ionHitsDrone,
  tickSwarm,
} from "./swarm.ts";
import { COMBAT2, orbitLegSeconds } from "../wiki/cited-combat2.ts";

const OFFENSIVE = ["striker", "combat2", "beam", "beam2", "fire", "board", "ionintruder"];

/** A quiet fight: no guns, no rocks, no fleet, no teleporter. */
function quiet(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
  g.enemyEscape = null;
  for (const w of [...g.player.weapons, ...g.enemy.weapons]) {
    w.enabled = false;
    w.charge = 0;
    w.target = null;
  }
  return g;
}

/** Give the enemy a Drone Control with this hidden loadout, fully powered, nothing deployed yet. */
function fleet(g: Game, loadout: string[], level = 8, parts = 8) {
  const enemy = g.enemy!;
  enemy.kits.swarm = { id: "swarm", level, power: level, left: 0, cool: 0, target: null, on: false, aux: 0, loadout };
  enemy.parts = parts;
  return enemy.kits.swarm;
}

function units(g: Game): DroneUnit[] {
  return g.enemy?.kits.swarm?.drones ?? [];
}

function dropPlayerShields(g: Game) {
  g.player.systems.shields.power = 0;
  g.player.shieldNow = 0;
  g.player.zoltan = undefined;
}

describe("enemy drone allowance (Template:Enemy ships drones)", () => {
  it("never gives an Engi ship an offensive or boarding drone", () => {
    for (const id of ["engi-scout", "engi-outrider", "engi-bomber", "engi-hacker"]) {
      const row = ENEMY_DRONES[id];
      assert.ok(row);
      assert.deepEqual(row.drones.filter((d) => OFFENSIVE.includes(d)), []);
    }
    let seen = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = createGame(seed);
      g.sector = 5;
      g.sectorName = "Engi Controlled Sector";
      startCombat(g, "Engi ship");
      const loadout = g.enemy?.kits.swarm?.loadout ?? [];
      if (g.enemy?.faction !== "engi") continue;
      seen += loadout.length;
      for (const kind of loadout) assert.ok(["ward", "ward2", "wardcut"].includes(kind), kind);
    }
    assert.ok(seen > 0);
  });

  it("keeps every roll inside the class list, the Drone Control level, and the drone cap", () => {
    let r = 0.123;
    const rand = () => (r = (r * 9301 + 0.49297) % 1);
    for (const [id, row] of Object.entries(ENEMY_DRONES)) {
      for (let level = 1; level <= 8; level++) {
        const out = rollDrones(id, level, rand);
        assert.ok(out.length <= row.maxDrones);
        assert.ok(out.reduce((sum, k) => sum + SCHEMATIC_POWER[k], 0) <= level);
        for (const k of out) {
          assert.ok(row.drones.includes(k));
          assert.ok(ENEMY_RUNNABLE.has(k));
        }
      }
    }
    // Drone Control, Overview: "Enemies can have up to 4 active drones".
    assert.equal(ENEMY_DRONES["rebel-rigger"].maxDrones, 4);
    assert.equal(ENEMY_DRONES["auto-assault"].maxDrones, 3);
    assert.equal(ENEMY_DRONES["energy-bomber"].maxDrones, 2);
  });

  it("prices each schematic the same as the player's DRONE_POWER", () => {
    for (const [kind, power] of Object.entries(DRONE_POWER)) {
      if (kind in SCHEMATIC_POWER) assert.equal(SCHEMATIC_POWER[kind], power, kind);
    }
  });
});

describe("enemy drone parts (Enemy Ships, Missile and drone stocks)", () => {
  it("is the baseline, raised to double the drone count", () => {
    assert.equal(enemyParts("rebel-rigger", 0), 4);
    assert.equal(enemyParts("rebel-rigger", 3), 6);
    assert.equal(enemyParts("rebel-rigger", 4), 8);
    assert.equal(enemyParts("rebel-disruptor", 2), 4);
    assert.equal(enemyParts("auto-assault", 2), 5);
    assert.equal(enemyParts("auto-assault", 3), 6);
    assert.equal(enemyParts("energy-hacker", 0), 5);
    assert.equal(enemyParts("energy-bomber", 1), 2);
    assert.equal(enemyParts("energy-bomber", 2), 4);
    assert.equal(enemyParts("auto-hacker", 0), 4);
    assert.equal(enemyParts("rebel-fighter", 0), 4);
  });

  it("sets ship.parts on generated hulls", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      g.sector = 5;
      g.sectorName = "Rebel Controlled Sector";
      startCombat(g, "Rebel ship");
      const enemy = g.enemy!;
      if (!enemy.classId) continue;
      const n = enemy.kits.swarm?.loadout?.length ?? 0;
      assert.equal(enemy.parts, enemyParts(enemy.classId, n));
    }
  });
});

describe("enemy drone deployment", () => {
  it("deploys nothing before the fight ticks, then deploys within power and spends a part each", () => {
    let checked = 0;
    for (let seed = 1; seed <= 60 && checked < 5; seed++) {
      const g = createGame(seed);
      g.sector = 6;
      g.sectorName = "Rebel Controlled Sector";
      startCombat(g, "Rebel ship");
      const kit = g.enemy?.kits.swarm;
      if (!kit?.loadout?.length) continue;
      checked += 1;
      // Drone Control, "Drone Schematics": the drones "aren't deployed yet" before the fight.
      assert.equal(kit.drones, undefined);
      assert.equal(kit.on, false);
      const parts = g.enemy!.parts;
      tickSwarm(g, 0.05);
      const live = units(g).filter((u) => u.alive);
      assert.equal(live.length, kit.loadout.length);
      assert.equal(g.enemy!.parts, parts - live.length);
      assert.ok(live.reduce((sum, u) => sum + SCHEMATIC_POWER[u.kind], 0) <= kit.level);
    }
    assert.ok(checked > 0);
  });

  it("only deploys what the bars power, and only while parts last", () => {
    const g = quiet(3);
    fleet(g, ["ward", "striker", "ward2"], 4, 1);
    tickSwarm(g, 0.05);
    const [a, b, c] = units(g);
    assert.equal(a.alive, true);
    assert.equal(b.alive, false);
    assert.equal(c.alive, false);
    assert.equal(g.enemy!.parts, 0);
  });
});

describe("enemy offensive drones", () => {
  it("a Combat Drone Mark I keeps shooting the player's rooms", () => {
    const g = quiet(5);
    fleet(g, ["striker"], 2);
    dropPlayerShields(g);
    const hull = g.player.hull;
    const seen = new Set<string>();
    for (let i = 0; i < 1200; i++) {
      step(g, 0.05);
      for (const s of g.shots) if (s.label?.startsWith(DRONE_LABEL) && s.from === "enemy") seen.add(s.id);
      g.player.shieldNow = 0;
    }
    assert.ok(seen.size >= 10, `shots ${seen.size}`);
    assert.ok(g.player.hull < hull);
  });

  it("a Combat Drone Mark II finishes a shorter leg than Mark I", () => {
    const g = quiet(41);
    fleet(g, ["combat2"], 4);
    dropPlayerShields(g);
    tickSwarm(g, 0.05);
    const unit = units(g)[0];
    unit.heading = 0;
    unit.bearing = 180;
    unit.left = orbitLegSeconds(0, 180, COMBAT2.speed);
    unit.aux = 0;
    g.shots = [];
    tickSwarm(g, unit.left - 0.01);
    assert.equal(g.shots.filter((s) => s.label?.startsWith(DRONE_LABEL)).length, 0);
    tickSwarm(g, 0.01);
    const shot = g.shots.find((s) => s.label?.startsWith(DRONE_LABEL));
    assert.ok(shot);
    assert.equal(shot.kind, "laser");
    assert.equal(shot.damage, 1);
    assert.equal(shot.from, "enemy");
    assert.ok(unit.left < 4);
  });

  it("a beam drone does nothing through shields and burns hull without them", () => {
    const up = quiet(6);
    fleet(up, ["beam"], 2);
    up.player.shieldNow = 2;
    up.player.systems.shields.power = 4;
    const hull = up.player.hull;
    for (let i = 0; i < 400; i++) step(up, 0.05);
    assert.equal(up.player.hull, hull);

    const down = quiet(6);
    fleet(down, ["beam"], 2);
    dropPlayerShields(down);
    const before = down.player.hull;
    for (let i = 0; i < 400; i++) step(down, 0.05);
    assert.ok(down.player.hull < before);
  });

  it("stops when their Drone Control is destroyed, and repowers after repair without a part", () => {
    const g = quiet(7);
    const kit = fleet(g, ["striker"], 2, 4);
    tickSwarm(g, 0.05);
    assert.equal(g.enemy!.parts, 3);
    kit.damage = 2;
    kit.power = 0;
    g.shots = [];
    for (let i = 0; i < 20; i++) tickSwarm(g, 0.5);
    assert.equal(g.shots.filter((s) => s.label?.startsWith(DRONE_LABEL)).length, 0);
    assert.equal(units(g)[0].powered, false);
    kit.damage = 0;
    kit.power = 2;
    for (let i = 0; i < 20; i++) tickSwarm(g, 0.5);
    assert.ok(g.shots.some((s) => s.label?.startsWith(DRONE_LABEL)));
    assert.equal(g.enemy!.parts, 3);
  });

  it("redeploys a destroyed drone after 10 seconds for another part", () => {
    const g = quiet(8);
    fleet(g, ["striker"], 2, 2);
    tickSwarm(g, 0.05);
    const unit = units(g)[0];
    unit.alive = false;
    unit.cool = REDEPLOY_S;
    tickSwarm(g, REDEPLOY_S - 1);
    assert.equal(unit.alive, false);
    tickSwarm(g, 1.01);
    assert.equal(unit.alive, true);
    assert.equal(g.enemy!.parts, 0);
  });
});

describe("enemy defensive drones", () => {
  it("a Defense Drone Mark I waits a second, then shoots down a missile but not a laser", () => {
    const g = quiet(9);
    fleet(g, ["ward"], 2);
    tickSwarm(g, 0.05);
    assert.equal(units(g)[0].cool, ACQUIRE_S);
    assert.equal(enemyDefenseIntercept(g, { kind: "missile", from: "player" }), false);
    tickSwarm(g, ACQUIRE_S);
    assert.equal(enemyDefenseIntercept(g, { kind: "laser", from: "player" }), false);
    assert.equal(enemyDefenseIntercept(g, { kind: "missile", from: "player" }), true);
    assert.equal(units(g)[0].cool, DRONE_COOLDOWN_S.ward);
    assert.equal(enemyDefenseIntercept(g, { kind: "missile", from: "player" }), false);
  });

  it("a Defense Drone Mark II takes lasers, and the Defense Scrambler blinds both", () => {
    const g = quiet(10);
    fleet(g, ["ward2"], 3);
    tickSwarm(g, 0.05);
    tickSwarm(g, ACQUIRE_S);
    assert.equal(enemyDefenseIntercept(g, { kind: "laser", from: "player" }), true);

    const s = quiet(10);
    s.augments = ["scrambler"];
    fleet(s, ["ward2"], 3);
    tickSwarm(s, 0.05);
    tickSwarm(s, ACQUIRE_S);
    assert.equal(enemyDefenseIntercept(s, { kind: "laser", from: "player" }), false);
  });

  it("an enemy Anti-Combat Drone stuns or destroys your combat drone", () => {
    let stunned = 0;
    let killed = 0;
    for (let seed = 11; seed < 31; seed++) {
      const g = quiet(seed);
      g.player.kits.swarm = { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
      g.player.parts = 2;
      assert.equal(deploy(g, "striker"), true);
      fleet(g, ["wardcut"], 1);
      tickSwarm(g, 0.05);
      tickSwarm(g, ACQUIRE_S + 0.01);
      const kit = g.player.kits.swarm;
      if (!kit.on) killed += 1;
      else if ((kit.stun ?? 0) > ANTI_STUN_S - 1.1) stunned += 1;
    }
    assert.ok(stunned > 0 && killed > 0, `${stunned} ${killed}`);
  });
});

describe("enemy boarding drones", () => {
  it("your defense drone shoots one down in flight", () => {
    const g = quiet(12);
    g.player.kits.swarm = { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
    g.player.parts = 2;
    assert.equal(deploy(g, "ward"), true);
    fleet(g, ["board"], 3);
    tickSwarm(g, 0.05);
    tickSwarm(g, 0.05);
    assert.equal(units(g)[0].alive, false);
    // The cooldown was spent this tick (and has already ticked down by that tick's dt).
    assert.ok(g.player.kits.swarm.cool > DRONE_COOLDOWN_S.ward - 0.1);
  });

  it("breaks on a Zoltan Shield, and otherwise breaches in and attacks", () => {
    const z = quiet(13);
    z.player.zoltan = 5;
    fleet(z, ["board"], 3);
    tickSwarm(z, 0.05);
    tickSwarm(z, BOARD_FLY_S + 0.1);
    assert.equal(units(z)[0].alive, false);
    assert.equal(z.player.zoltan, 5);

    const g = quiet(13);
    g.player.zoltan = undefined;
    fleet(g, ["board"], 3);
    tickSwarm(g, 0.05);
    tickSwarm(g, BOARD_FLY_S + 0.1);
    const unit = units(g)[0];
    assert.ok(unit.room);
    const room = g.player.rooms.find((r) => r.id === unit.room)!;
    assert.ok(room.breach >= 1);
    // Clear the room so the drone works on the system.
    for (const c of g.crew) if (c.room === room.id && c.aboard === "player") c.room = g.player.rooms.find((r) => r.id !== room.id)!.id;
    const damage = Object.values(g.player.systems).reduce((sum, s) => sum + s.damage, 0);
    for (let i = 0; i < 40; i++) tickSwarm(g, 0.5);
    assert.ok(Object.values(g.player.systems).reduce((sum, s) => sum + s.damage, 0) > damage);
  });

  it("an Ion Intruder ionizes a player system", () => {
    const g = quiet(14);
    fleet(g, ["ionintruder"], 3);
    tickSwarm(g, 0.05);
    tickSwarm(g, BOARD_FLY_S + 0.1);
    for (let i = 0; i < 25; i++) tickSwarm(g, 0.5);
    assert.ok(Object.values(g.player.systems).some((s) => s.ion.length >= 3));
  });
});

describe("drone interception API (for the Hacking work)", () => {
  it("answers down / stun / null for the defending side", () => {
    const none = quiet(15);
    assert.equal(interceptIncomingDrone(none, "player", "hacking"), null);

    const ward = quiet(15);
    ward.player.kits.swarm = { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
    ward.player.parts = 1;
    deploy(ward, "ward");
    assert.equal(interceptIncomingDrone(ward, "player", "hacking"), "down");
    assert.equal(interceptIncomingDrone(ward, "player", "hacking"), null);

    const cut = quiet(16);
    cut.player.kits.swarm = { id: "swarm", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    cut.player.parts = 1;
    deploy(cut, "wardcut");
    assert.ok(["down", "stun"].includes(interceptIncomingDrone(cut, "player", "hacking") ?? ""));
    assert.equal(interceptIncomingDrone(cut, "player", "hacking"), null);

    const theirs = quiet(17);
    fleet(theirs, ["ward"], 2);
    tickSwarm(theirs, 0.05);
    tickSwarm(theirs, ACQUIRE_S);
    assert.equal(interceptIncomingDrone(theirs, "enemy", "hacking"), "down");

    const scrambled = quiet(17);
    scrambled.augments = ["scrambler"];
    fleet(scrambled, ["ward", "wardcut"], 3);
    tickSwarm(scrambled, 0.05);
    tickSwarm(scrambled, ACQUIRE_S);
    assert.equal(interceptIncomingDrone(scrambled, "enemy", "hacking"), null);
  });
});

describe("ion on external drones (Drone Control, Overview)", () => {
  it("stuns 5 s per ion and can destroy after the first second", () => {
    let destroyed = 0;
    for (let seed = 20; seed < 40; seed++) {
      const g = quiet(seed);
      fleet(g, ["striker"], 2);
      tickSwarm(g, 0.05);
      const unit = units(g)[0];
      assert.equal(ionHitsDrone(unit, 1), true);
      assert.equal(unit.stun, 5);
      for (let i = 0; i < 12; i++) tickSwarm(g, 0.5);
      if (!unit.alive) destroyed += 1;
      else assert.equal(unit.stun ?? 0, 0);
    }
    // 1 − 0.85^4 ≈ 48% per stun.
    assert.ok(destroyed > 0 && destroyed < 20, String(destroyed));
  });
});

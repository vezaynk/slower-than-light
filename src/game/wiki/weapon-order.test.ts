import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { primeWeapons } from "../extras/augments.ts";
import { reorderDroneSlots, tickEnemyDrones } from "../extras/swarm.ts";
import { enemyMayMount, rollEnemy } from "../enemy-gen.ts";
import {
  aim,
  applyIon,
  armWeapon,
  createGame,
  depowerWeapon,
  powerDown,
  powerMask,
  powerUp,
  reorderWeapons,
  reverseSlotAuto,
  settleZoltanPower,
  startCombat,
  step,
  toggleAutoAll,
  weaponsPowerLocked,
  zoltanBars,
} from "../sim.ts";
import type { Crew, Game, Kit, WeaponInst } from "../types.ts";
import { ENEMY_CLASSES, ENEMY_WEAPON_POOLS } from "./enemy-ships.ts";

function gun(defId: string, extra: Partial<WeaponInst> = {}): WeaponInst {
  return { uid: defId, defId, charge: 0, enabled: true, autofire: false, target: null, ...extra, uid: extra.uid ?? defId };
}

function spark(room: string, id: string): Crew {
  return {
    id,
    name: id,
    side: "player",
    aboard: "player",
    hp: 70,
    maxHp: 70,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin: "spark",
  };
}

function fight(seed = 3): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  g.paused = false;
  g.asb = false;
  g.player.hull = 30;
  g.player.hullMax = 30;
  if (g.enemy) {
    g.enemy.hull = 30;
    g.enemy.hullMax = 30;
    g.enemy.weapons = [];
    if (g.enemyEscape) g.enemyEscape = { ...g.enemyEscape, mode: "never", running: false };
  }
  return g;
}

function parkGunners(g: Game) {
  for (const ship of [g.player, g.enemy]) {
    if (!ship) continue;
    const gunRoom = ship.rooms.find((r) => r.system === "weapons");
    const park = ship.rooms.find((r) => r !== gunRoom);
    if (!gunRoom || !park) continue;
    const aboard = ship === g.player ? "player" : "enemy";
    for (const c of g.crew) {
      if (c.aboard === aboard && c.room === gunRoom.id) {
        c.room = park.id;
        c.path = [];
      }
    }
  }
}

function feed(g: Game, level: number, power: number, ids: string[]) {
  g.player.reactor = 30;
  const sys = g.player.systems.weapons;
  sys.level = level;
  sys.power = power;
  sys.damage = 0;
  sys.ion = [];
  delete sys.zoltanHeld;
  g.player.weapons = ids.map((id) => gun(id));
}

function shotsOf(g: Game, defId: string, from: "player" | "enemy" = "player") {
  return g.shots.filter((s) => s.from === from && s.defId === defId);
}

/** Shots leave the list when they land, so a count has to remember ids. */
function watch(g: Game, defId: string, from: "player" | "enemy" = "player") {
  const seen: string[] = [];
  return () => {
    for (const s of shotsOf(g, defId, from)) if (!seen.includes(s.id)) seen.push(s.id);
    return seen.length;
  };
}

/** Step until `pred` or `limit` ticks of 0.05s. Returns how many ticks ran. */
function until(g: Game, pred: () => boolean, limit: number): number {
  let n = 0;
  while (n < limit && !pred()) {
    step(g, 0.05);
    n += 1;
  }
  return n;
}

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

describe("charger banks", () => {
  it("stores an Ion Charger shot every 6 seconds and fires the whole bank on a click", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["ioncharger"]);
    const w = g.player.weapons[0];
    const room = g.enemy!.rooms[0].id;
    const first = until(g, () => (w.loaded ?? 0) >= 1, 160);
    assert.ok(first >= 110 && first <= 140, `first shot at ${first}`);
    assert.equal(w.loaded, 1);
    assert.ok(w.charge < 0.05);
    assert.equal(shotsOf(g, "ioncharger").length, 0);

    const third = until(g, () => (w.loaded ?? 0) >= 3, 400);
    assert.ok(third >= 220 && third <= 280, `rest of the bank at ${third}`);
    assert.equal(w.loaded, 3);
    assert.equal(w.charge, 0);
    assert.equal(shotsOf(g, "ioncharger").length, 0);

    armWeapon(g, w.uid);
    aim(g, room);
    const volley = shotsOf(g, "ioncharger");
    assert.equal(volley.length, 3);
    assert.ok(volley.every((s) => s.ion === 1));
    assert.equal(w.loaded, 0);
    assert.equal(w.target, null);
  });

  it("fires one Ion Charger shot early, and keeps the next shot's progress", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["ioncharger"]);
    const w = g.player.weapons[0];
    const room = g.enemy!.rooms[0].id;
    until(g, () => (w.loaded ?? 0) >= 1, 160);
    w.loaded = 2;
    w.charge = 0.4;
    armWeapon(g, w.uid);
    aim(g, room);
    assert.equal(shotsOf(g, "ioncharger").length, 2);
    assert.equal(w.loaded, 0);
    assert.ok(Math.abs(w.charge - 0.4) < 1e-9);
  });

  it("autofire releases each finished shot and does not bank", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["ioncharger"]);
    toggleAutoAll(g);
    const w = g.player.weapons[0];
    const room = g.enemy!.rooms[0].id;
    armWeapon(g, w.uid);
    aim(g, room);
    const fired = watch(g, "ioncharger");
    assert.equal(fired(), 0);
    let n = 0;
    while (fired() < 1 && n < 200) {
      step(g, 0.05);
      n += 1;
    }
    assert.equal(fired(), 1);
    assert.equal(w.loaded ?? 0, 0);
    assert.equal(w.target, room);
    const atFirst = n;
    while (fired() < 2 && n < 400) {
      step(g, 0.05);
      n += 1;
    }
    assert.equal(fired(), 2);
    assert.ok(n - atFirst > 80, `second shot followed after ${n - atFirst}`);
    assert.equal(w.loaded ?? 0, 0);
  });

  it("primes one charger shot and still fills a normal gun", () => {
    const g = createGame(4);
    g.augments = ["hot"];
    feed(g, 4, 4, ["ioncharger", "lineburst"]);
    g.player.weapons[0].charge = 0.2;
    g.player.weapons[1].charge = 0.2;
    primeWeapons(g);
    assert.equal(g.player.weapons[0].loaded, 1);
    assert.equal(g.player.weapons[0].charge, 0);
    assert.equal(g.player.weapons[1].charge, 1);
    assert.equal(g.player.weapons[1].loaded, undefined);
  });

  it("keeps the bank when the slot loses power", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["ioncharger"]);
    const w = g.player.weapons[0];
    w.loaded = 2;
    w.charge = 0.25;
    w.enabled = false;
    for (let i = 0; i < 10; i++) step(g, 0.05);
    assert.equal(w.loaded, 2);
    assert.equal(w.charge, 0.25);
  });

  it("banks Laser Charger (S) to 2 and Laser Charger Mark II to 4", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["chargers"]);
    const small = g.player.weapons[0];
    const first = until(g, () => (small.loaded ?? 0) >= 1, 160);
    assert.ok(first >= 100 && first <= 140, `S first shot at ${first}`);
    until(g, () => (small.loaded ?? 0) >= 2, 200);
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.equal(small.loaded, 2);

    feed(g, 4, 4, ["charger2"]);
    const mark = g.player.weapons[0];
    until(g, () => (mark.loaded ?? 0) >= 4, 500);
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.equal(mark.loaded, 4);
    assert.equal(shotsOf(g, "charger2").length, 0);
  });
});

describe("weapon power lock and order", () => {
  it("blocks reactor and slot power while ionized, and still reorders", () => {
    const g = createGame(11);
    feed(g, 6, 4, ["leto", "burst1", "charger"]);
    g.player.weapons[2].loaded = 1;
    g.player.weapons[2].charge = 0.3;
    g.player.weapons[2].enabled = false;
    g.player.systems.engines.level = Math.max(g.player.systems.engines.level, 2);
    g.player.systems.engines.power = Math.max(g.player.systems.engines.power, 1);
    applyIon(g.player, "weapons", 1);
    assert.equal(weaponsPowerLocked(g), true);
    const locked = g.player.systems.weapons.power;
    powerDown(g, "weapons");
    powerUp(g, "weapons");
    assert.equal(g.player.systems.weapons.power, locked);
    const engines = g.player.systems.engines.power;
    powerDown(g, "engines");
    assert.equal(g.player.systems.engines.power, engines - 1);

    depowerWeapon(g, "leto");
    assert.equal(g.player.weapons[0].enabled, true);
    armWeapon(g, "charger");
    assert.equal(g.player.weapons[2].enabled, false);
    armWeapon(g, "leto");
    assert.equal(g.targeting, true);
    reverseSlotAuto(g, "leto");
    assert.equal(g.player.weapons[0].autoInvert, true);

    reorderWeapons(g, 2, 0);
    assert.deepEqual(
      g.player.weapons.map((w) => w.uid),
      ["charger", "leto", "burst1"],
    );
    assert.equal(g.player.weapons[0].loaded, 1);
    assert.equal(g.player.weapons[0].charge, 0.3);
    reorderWeapons(g, 0, 0);
    reorderWeapons(g, -1, 0);
    assert.equal(g.player.weapons[0].uid, "charger");

    g.player.systems.weapons.ion = [];
    feed(g, 4, 4, ["vulcan", "burst1", "charger"]);
    const room = g.player.rooms.find((r) => r.system === "weapons")!.id;
    g.crew.push(spark(room, "za"), spark(room, "zb"));
    settleZoltanPower(g);
    assert.deepEqual(powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons")), [false, true, false]);
    reorderWeapons(g, 1, 0);
    assert.equal(g.player.weapons[0].defId, "burst1");
    assert.equal(powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"))[0], true);
  });

  it("still fires a slot that has power while ionized", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 3, 2, ["spark"]);
    g.player.weapons[0].charge = 1;
    applyIon(g.player, "weapons", 1);
    const w = g.player.weapons[0];
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    assert.equal(shotsOf(g, "spark").length, 1);
  });

  it("holds a banked charger through a hack pulse, and still drains a normal gun", () => {
    const g = fight(9);
    parkGunners(g);
    feed(g, 4, 4, ["ioncharger", "burst1"]);
    const ion = g.player.weapons[0];
    const burst = g.player.weapons[1];
    ion.loaded = 2;
    ion.charge = 0.4;
    burst.charge = 1;
    const room = g.enemy!.rooms[0].id;
    g.enemy!.kits.spike = {
      id: "spike",
      level: 2,
      power: 2,
      left: 7,
      cool: 0,
      target: "weapons",
      on: true,
      aux: 0,
      hackLatched: true,
    };
    assert.equal(weaponsPowerLocked(g), true);
    const power = g.player.systems.weapons.power;
    powerDown(g, "weapons");
    assert.equal(g.player.systems.weapons.power, power);

    armWeapon(g, burst.uid);
    aim(g, room);
    assert.equal(shotsOf(g, "burst1").length, 0);
    assert.equal(burst.target, room);
    burst.target = null;
    burst.charge = 0.5;

    armWeapon(g, ion.uid);
    aim(g, room);
    assert.equal(shotsOf(g, "ioncharger").length, 0);
    assert.equal(ion.loaded, 2);
    assert.equal(ion.charge, 0.4);
    depowerWeapon(g, ion.uid);
    assert.equal(ion.enabled, true);

    for (let i = 0; i < 10; i++) step(g, 0.05);
    assert.equal(ion.loaded, 2);
    assert.equal(ion.charge, 0.4);
    assert.ok(burst.charge < 0.5);
    assert.equal(shotsOf(g, "ioncharger").length, 0);

    reorderWeapons(g, 1, 0);
    assert.equal(g.player.weapons[0].uid, "burst1");
    assert.equal(ion.loaded, 2);

    const hack = g.enemy!.kits.spike!;
    hack.on = false;
    hack.left = 0;
    hack.cool = 30;
    step(g, 0.05);
    const volley = shotsOf(g, "ioncharger");
    assert.equal(volley.length, 2);
    assert.ok(volley.every((s) => s.ion === 1));
    assert.equal(ion.loaded, 0);
    assert.equal(shotsOf(g, "burst1").length, 0);
  });
});

describe("drone order and enemy chargers", () => {
  it("moves an enemy drone schematic and its unit together", () => {
    const g = fight(12);
    const enemy = g.enemy!;
    enemy.reactor = 40;
    for (const room of enemy.rooms) if (room.kit === "swarm") delete room.kit;
    enemy.parts = 8;
    enemy.kits.swarm = {
      id: "swarm",
      level: 4,
      power: 4,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
      zoltan: 2,
      loadout: ["combat2", "ward", "striker"],
      drones: [
        { id: "a", kind: "combat2", alive: true, powered: true, aux: 0, cool: 0, stun: 10 },
        { id: "b", kind: "ward", alive: true, powered: true, aux: 0, cool: 0, stun: 10 },
        { id: "c", kind: "striker", alive: true, powered: true, aux: 0, cool: 0, stun: 10 },
      ],
    };
    const kit = enemy.kits.swarm;
    reorderDroneSlots(kit, 1, 0);
    assert.deepEqual(kit.loadout, ["ward", "combat2", "striker"]);
    assert.deepEqual(
      kit.drones!.map((d) => d.id),
      ["b", "a", "c"],
    );
    tickEnemyDrones(g, 0);
    assert.deepEqual(
      kit.drones!.map((d) => d.powered),
      [true, false, true],
    );
    reorderDroneSlots(kit, 0, 0);
    assert.equal(kit.loadout![0], "ward");

    const mismatch: Kit = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
      loadout: ["ward", "patch"],
      drones: [{ id: "only", kind: "ward", alive: false, powered: false, aux: 0, cool: 0 }],
    };
    reorderDroneSlots(mismatch, 1, 0);
    assert.deepEqual(mismatch.loadout, ["ward", "patch"]);
    assert.equal(mismatch.drones![0].id, "only");

    const single: Kit = { id: "swarm", level: 2, power: 0, left: 0, cool: 0, target: "ward", on: false, aux: 0 };
    reorderDroneSlots(single, 0, 1);
    assert.equal(single.target, "ward");
  });

  it("never mounts Laser Charger (S), and an enemy Laser Charger Mark II fires one shot", () => {
    assert.equal(enemyMayMount("chargers"), false);
    assert.equal(enemyMayMount("charger2"), true);
    for (const names of Object.values(ENEMY_WEAPON_POOLS)) assert.equal(names.includes("Laser Charger (S)"), false);
    for (const cls of ENEMY_CLASSES) {
      const spec = rollEnemy(cls, false, { sector: 3, sectorName: "Civilian Sector", difficulty: "normal" }, seeded(cls.id.length + 4));
      assert.equal(spec.weapons.includes("chargers"), false, cls.id);
    }

    const g = fight(15);
    parkGunners(g);
    // Nobody aboard their weapons room, so the 5 second clock is not a manning bonus or a Zoltan bar.
    g.crew = g.crew.filter((c) => c.side === "player");
    g.player.weapons = [];
    const enemy = g.enemy!;
    delete enemy.kits.swarm;
    enemy.systems.weapons.level = 4;
    enemy.systems.weapons.power = 4;
    enemy.systems.weapons.damage = 0;
    enemy.systems.weapons.ion = [];
    enemy.weapons = [gun("charger2", { uid: "e-mark" })];
    enemy.weapons[0].target = g.player.rooms[0].id;
    const w = enemy.weapons[0];
    const fired = watch(g, "charger2", "enemy");
    const at = until(g, () => fired() >= 1, 160);
    assert.ok(at >= 90 && at <= 140, `enemy shot at ${at}`);
    assert.equal(fired(), 1);
    assert.equal(w.loaded ?? 0, 0);
    for (let i = 0; i < 30; i++) {
      step(g, 0.05);
      fired();
    }
    assert.equal(fired(), 1);
  });
});

describe("swarm missiles", () => {
  it("banks three shots at 7 seconds and spends one missile for the volley", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["swarmmissiles"]);
    g.missiles = 5;
    const w = g.player.weapons[0];
    const room = g.enemy!.rooms[0].id;
    const first = until(g, () => (w.loaded ?? 0) >= 1, 200);
    assert.ok(first >= 125 && first <= 155, `first shot at ${first}`);
    assert.equal(shotsOf(g, "swarmmissiles").length, 0);
    const third = until(g, () => (w.loaded ?? 0) >= 3, 500);
    assert.ok(third >= 250 && third <= 310, `rest of the bank at ${third}`);
    assert.equal(w.loaded, 3);
    assert.equal(w.charge, 0);
    assert.equal(g.missiles, 5);
    armWeapon(g, w.uid);
    aim(g, room);
    const volley = shotsOf(g, "swarmmissiles");
    assert.equal(volley.length, 3);
    assert.ok(volley.every((s) => s.damage === 1 && s.targetRoom === room));
    assert.equal(w.loaded, 0);
    assert.equal(g.missiles, 4);
  });

  it("fires one stored shot early and keeps the next shot's progress", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["swarmmissiles"]);
    g.missiles = 3;
    const w = g.player.weapons[0];
    w.loaded = 1;
    w.charge = 0.4;
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    assert.equal(shotsOf(g, "swarmmissiles").length, 1);
    assert.equal(g.missiles, 2);
    assert.equal(w.loaded, 0);
    assert.ok(Math.abs(w.charge - 0.4) < 1e-9);
  });

  it("autofire spends one missile per finished shot and does not bank", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["swarmmissiles"]);
    g.missiles = 5;
    toggleAutoAll(g);
    const w = g.player.weapons[0];
    const room = g.enemy!.rooms[0].id;
    armWeapon(g, w.uid);
    aim(g, room);
    const fired = watch(g, "swarmmissiles");
    const atFirst = until(g, () => fired() >= 1, 200);
    assert.ok(atFirst >= 125 && atFirst <= 155, `first autofire at ${atFirst}`);
    assert.equal(fired(), 1);
    assert.equal(g.missiles, 4);
    assert.equal(w.loaded ?? 0, 0);
    const atSecond = until(g, () => fired() >= 2, 400);
    assert.ok(atSecond >= 125, `second shot followed after ${atSecond}`);
    assert.equal(fired(), 2);
    assert.equal(g.missiles, 3);
    assert.equal(w.loaded ?? 0, 0);
  });

  it("keeps a stored bank when the magazine is empty", () => {
    const g = fight();
    parkGunners(g);
    feed(g, 4, 4, ["swarmmissiles"]);
    g.missiles = 0;
    const w = g.player.weapons[0];
    w.loaded = 2;
    w.charge = 0.4;
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    assert.equal(shotsOf(g, "swarmmissiles").length, 0);
    assert.equal(w.loaded, 2);
    assert.equal(g.missiles, 0);
  });

  it("primes one Swarm shot, and Pegasus still fires both missiles from one charge", () => {
    const primed = createGame(4);
    primed.augments = ["hot"];
    feed(primed, 4, 4, ["swarmmissiles"]);
    primed.player.weapons[0].charge = 0.2;
    primeWeapons(primed);
    assert.equal(primed.player.weapons[0].loaded, 1);
    assert.equal(primed.player.weapons[0].charge, 0);

    const g = fight(8);
    parkGunners(g);
    feed(g, 4, 4, ["pegasus"]);
    g.missiles = 4;
    const w = g.player.weapons[0];
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    const at = until(g, () => shotsOf(g, "pegasus").length >= 1, 500);
    assert.ok(at >= 380 && at <= 430, `pegasus at ${at}`);
    assert.equal(shotsOf(g, "pegasus").length, 2);
    assert.equal(g.missiles, 3);
    assert.equal(w.loaded, undefined);
  });

  it("is not mounted on a generated enemy, and neither is Pegasus", () => {
    assert.equal(enemyMayMount("swarmmissiles"), false);
    assert.equal(enemyMayMount("pegasus"), false);
    assert.equal(enemyMayMount("charger2"), true);
    for (const names of Object.values(ENEMY_WEAPON_POOLS)) {
      assert.equal(names.includes("Swarm Missiles"), false);
      assert.equal(names.includes("Pegasus Missile"), false);
    }
    for (const cls of ENEMY_CLASSES) {
      const spec = rollEnemy(cls, false, { sector: 3, sectorName: "Civilian Sector", difficulty: "normal" }, seeded(cls.id.length + 9));
      assert.equal(spec.weapons.includes("swarmmissiles"), false, cls.id);
      assert.equal(spec.weapons.includes("pegasus"), false, cls.id);
    }
  });
});

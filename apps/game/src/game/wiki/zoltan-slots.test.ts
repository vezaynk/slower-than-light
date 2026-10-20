import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tickLeash } from "../extras/leash.ts";
import { HACK_ION_LOCK, ionHitsHack } from "../extras/spike.ts";
import { DRONE_POWER, tickEnemyDrones, toggleSwarmPower } from "../extras/swarm.ts";
import {
  bars,
  createGame,
  kitBars,
  powerMask,
  powerUp,
  settleZoltanPower,
  sparePower,
  startCombat,
  toggleWeapon,
  zoltanBars,
} from "../sim.ts";
import type { Crew, Game, WeaponInst } from "../types.ts";

function spark(room: string, id: string, aboard: "player" | "enemy" = "player"): Crew {
  return {
    id,
    name: id,
    side: aboard,
    aboard,
    hp: 70,
    maxHp: 70,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin: "energy",
  };
}

function mount(defId: string): WeaponInst {
  return { uid: defId, defId, charge: 0, enabled: true, autofire: false, target: null };
}

function mask(g: Game): boolean[] {
  return powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"));
}

function arm(g: Game, level: number, power: number, ids: string[]) {
  g.player.reactor = 30;
  const sys = g.player.systems.weapons;
  sys.level = level;
  sys.power = power;
  sys.damage = 0;
  sys.ion = [];
  delete sys.zoltanHeld;
  g.player.weapons = ids.map(mount);
}

describe("Zoltan weapon slots", () => {
  it("leaves a full Vulcan dark and powers one laser beside it", () => {
    const g = createGame(31);
    arm(g, 4, 4, ["LASER_CHAINGUN_2", "LASER_BURST_2_A", "LASER_CHARGEGUN"]);
    g.crew.push(spark("p-weapons", "za"), spark("p-weapons", "zb"));
    // Weapon Control: only slot 2 or slot 3 runs while the Vulcan sits in slot 1.
    assert.deepEqual(mask(g), [false, true, false]);
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 2);
    assert.equal(g.player.systems.weapons.zoltanHeld, 2);
    assert.deepEqual(mask(g), [false, true, false]);
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 2);
    assert.equal(g.player.systems.weapons.zoltanHeld, 2);

    g.player.weapons = ["LASER_BURST_2_A", "LASER_CHARGEGUN", "LASER_CHAINGUN_2"].map(mount);
    assert.deepEqual(mask(g), [true, true, false]);
  });

  it("combines one Zoltan with reactor on a Halberd that does not fill the system", () => {
    const g = createGame(32);
    arm(g, 4, 2, ["BEAM_2", "MISSILES_1"]);
    g.crew.push(spark("p-weapons", "za"));
    const spare = sparePower(g.player);
    assert.deepEqual(mask(g), [true, false]);
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 2);
    assert.equal(g.player.systems.weapons.zoltanHeld, undefined);
    assert.equal(sparePower(g.player), spare);

    g.player.weapons = ["MISSILES_1", "BEAM_2"].map(mount);
    assert.deepEqual(mask(g), [true, false]);
  });

  it("powers a 4-power weapon from 3 reactor bars and a Zoltan in the room", () => {
    const g = createGame(39);
    arm(g, 4, 4, ["BEAM_3"]);
    const room = g.player.rooms.find((r) => r.system === "weapons")!.id;
    g.crew.push(spark(room, "za"));
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 3);
    assert.equal(g.player.systems.weapons.zoltanHeld, 1);
    assert.deepEqual(mask(g), [true]);

    g.player.weapons[0].enabled = false;
    g.player.systems.weapons.power = 0;
    const spare = sparePower(g.player);
    g.player.reactor -= spare - 3;
    assert.equal(sparePower(g.player), 3);
    toggleWeapon(g, "BEAM_3");
    assert.equal(g.player.weapons[0].enabled, true);
    assert.equal(g.player.systems.weapons.power, 3);
    assert.equal(
      g.log.some((line) => line.includes("Not enough power")),
      false,
    );
    assert.deepEqual(mask(g), [true]);
  });

  it("turns the gun off and frees its reactor bars when the Zoltan leaves", () => {
    for (const power of [3, 4]) {
      const g = createGame(40);
      arm(g, 4, power, ["BEAM_3"]);
      const room = g.player.rooms.find((r) => r.system === "weapons")!.id;
      const other = g.player.rooms.find((r) => r.id !== room)!.id;
      const zoltan = spark(room, "za");
      g.crew.push(zoltan);
      settleZoltanPower(g);
      assert.equal(g.player.systems.weapons.power, 3);
      g.player.reactor -= sparePower(g.player);
      assert.deepEqual(mask(g), [true]);

      zoltan.room = other;
      settleZoltanPower(g);
      assert.equal(g.player.weapons[0].enabled, false, `power ${power}`);
      assert.equal(g.player.systems.weapons.power, 0);
      assert.equal(sparePower(g.player), 3);

      g.player.reactor += 1;
      powerUp(g, "weapons");
      assert.equal(g.player.systems.weapons.power, 4);
      assert.equal(g.player.weapons[0].enabled, true);
      assert.deepEqual(mask(g), [true]);
    }
  });

  it("powers a Burst Laser II from one Zoltan plus one reactor bar", () => {
    const g = createGame(33);
    arm(g, 3, 1, ["LASER_BURST_3"]);
    g.crew.push(spark("p-weapons", "za"));
    assert.deepEqual(mask(g), [true]);
  });

  it("keeps a Zoltan-paid slot up after an ion bomb removes the reactor bars", () => {
    const g = createGame(34);
    arm(g, 4, 3, ["BEAM_2", "MISSILES_1"]);
    g.crew.push(spark("p-weapons", "za"));
    assert.deepEqual(mask(g), [true, true]);

    const sys = g.player.systems.weapons;
    sys.ion = [5, 5, 5, 5];
    sys.power = 0;
    assert.deepEqual(mask(g), [false, false]);

    g.player.weapons = ["MISSILES_1", "BEAM_2"].map(mount);
    assert.deepEqual(mask(g), [true, false]);

    g.crew.push(spark("p-weapons", "zb"), spark("p-weapons", "zc"));
    g.player.weapons = ["BEAM_2", "MISSILES_1"].map(mount);
    assert.deepEqual(mask(g), [true, false]);
    g.crew.push(spark("p-weapons", "zd"));
    assert.deepEqual(mask(g), [true, true]);
    settleZoltanPower(g);
    assert.equal(sys.power, 0);
    assert.equal(sys.zoltanHeld, undefined);
  });

  it("puts reactor back when the Zoltans leave and spare remains, and not when it does not", () => {
    const g = createGame(35);
    arm(g, 4, 4, ["LASER_CHAINGUN_2", "LASER_BURST_2_A", "LASER_CHARGEGUN"]);
    g.crew.push(spark("p-weapons", "za"), spark("p-weapons", "zb"));
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 2);
    g.crew = g.crew.filter((c) => c.kin !== "energy");
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 4);
    assert.equal(g.player.systems.weapons.zoltanHeld, undefined);
    // The restored bars run the Vulcan. The lasers they no longer cover are off, not dark.
    assert.deepEqual(
      g.player.weapons.map((w) => w.enabled),
      [true, false, false],
    );

    for (const w of g.player.weapons) w.enabled = true;
    g.crew.push(spark("p-weapons", "za"), spark("p-weapons", "zb"));
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 2);
    g.player.reactor -= sparePower(g.player);
    assert.equal(sparePower(g.player), 0);
    g.crew = g.crew.filter((c) => c.kin !== "energy");
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 2);
    assert.equal(g.player.systems.weapons.zoltanHeld, undefined);
    assert.deepEqual(mask(g), [false, true, false]);
  });

  it("does not restore a peeled bar while one Zoltan still fills the system", () => {
    const g = createGame(36);
    arm(g, 4, 4, ["BEAM_2", "MISSILES_1"]);
    g.crew.push(spark("p-weapons", "za"), spark("p-weapons", "zb"));
    settleZoltanPower(g);
    g.crew = g.crew.filter((c) => c.id !== "zb");
    settleZoltanPower(g);
    assert.equal(g.player.systems.weapons.power, 2);
    assert.equal(g.player.systems.weapons.zoltanHeld, 2);
    // The remaining Zoltan still occupies the Halberd, so reactor does not finish that slot.
    assert.deepEqual(mask(g), [false, true]);
  });

  it("wastes a partial Zoltan on a damaged one-bar system and still skips without one", () => {
    const g = createGame(37);
    arm(g, 2, 1, ["LASER_BURST_2_A", "MISSILES_1"]);
    g.player.systems.weapons.damage = 1;
    g.crew.push(spark("p-weapons", "za"));
    assert.deepEqual(mask(g), [false, false]);
    g.crew = g.crew.filter((c) => c.kin !== "energy");
    assert.deepEqual(mask(g), [false, true]);
  });
});

describe("Zoltan shield pairs and system cover", () => {
  it("fills an odd shield buffer with one Zoltan and peels one pair with two", () => {
    const g = createGame(38);
    g.player.reactor = 30;
    const shields = g.player.systems.shields;
    shields.level = 2;
    shields.power = 2;
    shields.ion = [];
    const spare = sparePower(g.player);
    g.crew.push(spark("p-shields", "za"));
    settleZoltanPower(g);
    assert.equal(shields.power, 2);
    assert.equal(shields.zoltanHeld, undefined);
    assert.equal(bars(shields, 1), 2);
    assert.equal(sparePower(g.player), spare);

    shields.level = 3;
    shields.power = 2;
    settleZoltanPower(g);
    assert.equal(shields.power, 2);
    assert.equal(shields.zoltanHeld, undefined);
    assert.equal(bars(shields, 1), 3);

    shields.level = 4;
    shields.power = 4;
    g.crew.push(spark("p-shields", "zb"));
    settleZoltanPower(g);
    assert.equal(shields.power, 2);
    assert.equal(shields.zoltanHeld, 2);
    assert.equal(bars(shields, 2), 4);
    settleZoltanPower(g);
    assert.equal(shields.power, 2);
    assert.equal(shields.zoltanHeld, 2);

    shields.level = 3;
    shields.power = 2;
    shields.zoltanHeld = undefined;
    settleZoltanPower(g);
    assert.equal(shields.power, 0);
    assert.equal(shields.zoltanHeld, 2);
    assert.equal(bars(shields, 2), 2);
    g.crew.push(spark("p-shields", "zc"));
    settleZoltanPower(g);
    assert.equal(shields.power, 0);
    assert.equal(bars(shields, 3), 3);

    g.crew = g.crew.filter((c) => c.room !== "p-shields");
    settleZoltanPower(g);
    assert.equal(shields.power, 0);
    assert.equal(shields.zoltanHeld, undefined);

    shields.power = 2;
    g.crew.push(spark("p-shields", "za"), spark("p-shields", "zb"));
    settleZoltanPower(g);
    assert.equal(shields.power, 0);
    assert.equal(shields.zoltanHeld, 2);
  });

  it("replaces engines, medbay, and oxygen only when the Zoltans cover every bar", () => {
    const g = createGame(39);
    g.player.reactor = 30;
    const engines = g.player.systems.engines;
    engines.level = 2;
    engines.power = 2;
    engines.ion = [];
    g.crew.push(spark("p-engines", "ze"));
    settleZoltanPower(g);
    assert.equal(engines.power, 2);
    assert.equal(engines.zoltanHeld, undefined);

    g.crew.push(spark("p-engines", "ze2"));
    settleZoltanPower(g);
    assert.equal(engines.power, 0);
    assert.equal(engines.zoltanHeld, 2);
    assert.equal(bars(engines, 2), 2);
    g.crew = g.crew.filter((c) => c.room !== "p-engines");
    settleZoltanPower(g);
    assert.equal(engines.power, 0);
    assert.equal(engines.zoltanHeld, undefined);

    const air = g.player.systems.oxygen;
    air.level = 2;
    air.power = 2;
    air.ion = [];
    g.crew.push(spark("p-oxygen", "zo"));
    settleZoltanPower(g);
    assert.equal(air.power, 2);
    air.level = 1;
    air.power = 0;
    settleZoltanPower(g);
    assert.equal(air.power, 0);
    assert.equal(bars(air, 1), 1);

    const med = g.player.systems.medbay;
    med.level = 2;
    med.power = 2;
    med.ion = [];
    g.crew.push(spark("p-medbay", "zm"));
    settleZoltanPower(g);
    assert.equal(med.power, 2);
    med.level = 1;
    med.power = 1;
    g.crew = g.crew.filter((c) => c.room !== "p-oxygen");
    settleZoltanPower(g);
    assert.equal(med.power, 0);
    assert.equal(med.zoltanHeld, 1);

    engines.level = 2;
    engines.power = 2;
    engines.ion = [5];
    delete engines.zoltanHeld;
    g.crew.push(spark("p-engines", "zi"));
    settleZoltanPower(g);
    assert.equal(engines.power, 2);
    assert.equal(engines.zoltanHeld, undefined);
    // Zoltans, ion-locked systems: reactor is replaced "When as many Zoltans enter and stay in the room as there
    // are power levels in Shields, Engines, Medbay/Clonebay, Oxygen".
    g.crew.push(spark("p-engines", "zi2"));
    settleZoltanPower(g);
    assert.equal(engines.power, 0);
    assert.equal(engines.zoltanHeld, 2);
    g.crew = g.crew.filter((c) => c.room !== "p-engines");
    settleZoltanPower(g);
    assert.equal(engines.power, 0);
  });

  it("does not peel a shield pair under ion unless the Zoltans cover every level", () => {
    const g = createGame(41);
    g.player.reactor = 30;
    const shields = g.player.systems.shields;
    shields.level = 4;
    shields.power = 3;
    shields.ion = [5];
    delete shields.zoltanHeld;
    g.crew.push(spark("p-shields", "za"), spark("p-shields", "zb"));
    settleZoltanPower(g);
    assert.equal(shields.power, 3);
    assert.equal(shields.zoltanHeld, undefined);
    g.crew.push(spark("p-shields", "zc"), spark("p-shields", "zd"));
    settleZoltanPower(g);
    assert.equal(shields.power, 0);
    assert.equal(shields.zoltanHeld, 3);
  });

  it("replaces reactor in ion-locked Weapon Control, and leaving does not put it back", () => {
    // Weapon Control: Zoltans "replace the reactor power from ion-locked Weapon Control system with their zoltan
    // power and remove the reactor power if they leave the room."
    const g = createGame(42);
    arm(g, 4, 3, ["BEAM_2", "MISSILES_1"]);
    const sys = g.player.systems.weapons;
    sys.ion = [5];
    const spare = sparePower(g.player);
    g.crew.push(spark("p-weapons", "za"));
    settleZoltanPower(g);
    assert.equal(sys.power, 2);
    assert.equal(sys.zoltanHeld, 1);
    assert.equal(sparePower(g.player), spare + 1);
    assert.deepEqual(mask(g), [true, false]);
    g.crew = g.crew.filter((c) => c.kin !== "energy");
    settleZoltanPower(g);
    assert.equal(sys.power, 2);
    assert.equal(sys.zoltanHeld, undefined);
    assert.equal(sparePower(g.player), spare + 1);
  });
});

describe("Zoltan drones, hacking ion, and mind control", () => {
  it("occupies enemy drone slots from the left when the system is full", () => {
    const g = createGame(40);
    startCombat(g, "scout");
    const enemy = g.enemy!;
    enemy.reactor = 40;
    for (const room of enemy.rooms) if (room.kit === "drones") delete room.kit;
    enemy.parts = 8;
    enemy.kits.drones = {
      id: "drones",
      level: 4,
      power: 4,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
      zoltan: 2,
      loadout: ["COMBAT_2", "DEFENSE_1", "COMBAT_1"],
      drones: [
        { id: "a", kind: "COMBAT_2", alive: true, powered: true, aux: 0, cool: 0, stun: 10 },
        { id: "b", kind: "DEFENSE_1", alive: true, powered: true, aux: 0, cool: 0, stun: 10 },
        { id: "c", kind: "COMBAT_1", alive: true, powered: true, aux: 0, cool: 0, stun: 10 },
      ],
    };
    tickEnemyDrones(g, 0);
    const drones = enemy.kits.drones.drones!;
    assert.deepEqual(
      drones.map((d) => d.powered),
      [false, true, false],
    );

    enemy.kits.drones.zoltan = 0;
    enemy.kits.drones.power = 2;
    delete enemy.kits.drones.zoltanHeld;
    enemy.kits.drones.drones = undefined;
    enemy.kits.drones.loadout = ["BOARDER", "REPAIR"];
    enemy.parts = 8;
    tickEnemyDrones(g, 0);
    const skipped = enemy.kits.drones.drones!;
    assert.equal(skipped[0].alive, false);
    assert.equal(skipped[1].alive, true);

    enemy.kits.drones.zoltan = 2;
    enemy.kits.drones.power = 4;
    enemy.kits.drones.level = 4;
    delete enemy.kits.drones.drones;
    enemy.kits.drones.loadout = ["BOARDER", "DEFENSE_1", "REPAIR"];
    tickEnemyDrones(g, 0);
    const fresh = enemy.kits.drones.drones!;
    assert.equal(fresh[0].alive, false);
    assert.equal(fresh[1].alive, true);
    assert.equal(fresh[2].alive, true);

    enemy.kits.drones.drones = undefined;
    enemy.kits.drones.loadout = ["DEFENSE_1"];
    enemy.kits.drones.power = 4;
    enemy.kits.drones.zoltan = 2;
    settleZoltanPower(g);
    assert.equal(enemy.kits.drones.power, 2);
    assert.equal(enemy.kits.drones.zoltanHeld, 2);
    enemy.kits.drones.zoltan = 0;
    settleZoltanPower(g);
    assert.equal(enemy.kits.drones.power, 4);
    assert.equal(enemy.kits.drones.zoltanHeld, undefined);
  });

  it("keeps a deployed drone powered when only Zoltan bars cover it", () => {
    const g = createGame(41);
    g.player.reactor -= sparePower(g.player);
    g.player.kits.drones = {
      id: "drones",
      level: 2,
      power: 2,
      zoltan: DRONE_POWER.DEFENSE_1,
      on: true,
      target: "DEFENSE_1",
      left: 0,
      cool: 0,
      aux: 0,
    };
    toggleSwarmPower(g);
    toggleSwarmPower(g);
    const kit = g.player.kits.drones;
    assert.equal(kit.power, 0);
    assert.equal(kit.on, true);
    assert.ok(kitBars(kit) >= DRONE_POWER.DEFENSE_1);
  });

  it("interrupts a level 3 hack pulse on one ion point, Zoltans or not", () => {
    const g = createGame(42);
    startCombat(g, "scout");
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe && g.enemy);
    foe.leashed = 4;
    g.player.kits.hacking = {
      id: "hacking",
      level: 3,
      power: 3,
      zoltan: 3,
      left: 10,
      cool: 0,
      target: "mind",
      on: true,
      aux: 3,
      hackHeld: foe.id,
    };
    g.enemy.kits.battery = {
      id: "battery",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
      drained: 2,
    };
    ionHitsHack(g, g.player, 1);
    const kit = g.player.kits.hacking;
    assert.equal(kit.on, false);
    assert.equal(kit.left, 0);
    assert.equal(kit.aux, 0);
    assert.equal(kit.cool, HACK_ION_LOCK);
    assert.equal(kit.hackHeld, undefined);
    assert.equal(foe.leashed, undefined);
    assert.equal(g.enemy.kits.battery?.drained, undefined);

    const you = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(you);
    you.leashed = 6;
    g.enemy.kits.hacking = {
      id: "hacking",
      level: 3,
      power: 3,
      zoltan: 3,
      left: 10,
      cool: 0,
      target: "oxygen",
      on: true,
      aux: 1,
      hackHeld: you.id,
    };
    ionHitsHack(g, g.enemy, 1);
    assert.equal(g.enemy.kits.hacking.on, false);
    assert.equal(g.enemy.kits.hacking.cool, 1 * 5);
    assert.equal(you.leashed, undefined);
  });

  // Mind Control, Overview: the level is the powered bars, Zoltan bars included, and "Combat damage bonus and health
  // boost are removed if the system level is decreased". So three Zoltan bars keep the level 3 boost; losing one drops it.
  it("keeps a mind-control boost while Zoltan bars hold the level, and drops it when one leaves", () => {
    const g = createGame(43);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    if (g.enemy.kits.mind) g.enemy.kits.mind.cool = 999;
    const room = g.enemy?.rooms[0]?.id ?? "e-pilot";
    const foe = spark(room, "foe", "enemy");
    g.crew.push(foe);
    foe.leashed = 8;
    foe.leashBoost = 30;
    foe.maxHp += 30;
    foe.hp += 30;
    g.player.kits.mind = {
      id: "mind",
      level: 3,
      power: 0,
      zoltan: 3,
      on: true,
      left: 8,
      cool: 0,
      target: foe.id,
      aux: 0,
    };
    tickLeash(g, 0.05);
    assert.equal(foe.leashBoost, 30);
    g.player.kits.mind.zoltan = 2;
    tickLeash(g, 0.05);
    assert.equal(foe.leashBoost, undefined);
  });

  it("stays up under external ion when a Zoltan fills a bar, at a lower level", () => {
    // Zoltans: "Mind Control system with a Zoltan will not shutdown if it gets ionized by external factors."
    // Unfilled levels still ionize, which reduces the maximum effect and duration.
    const g = createGame(44);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    if (g.enemy.kits.mind) g.enemy.kits.mind.cool = 999;
    const room = g.enemy.rooms[0]?.id ?? "e-pilot";
    const foe = spark(room, "foe", "enemy");
    foe.leashed = 28;
    foe.leashBoost = 30;
    foe.maxHp = 100;
    foe.hp = 100;
    g.crew.push(foe);
    g.player.kits.mind = {
      id: "mind",
      level: 3,
      power: 1,
      zoltan: 1,
      on: true,
      left: 28,
      cool: 0,
      target: foe.id,
      aux: 0,
      ion: [5, 5],
    };
    tickLeash(g, 0.05);
    assert.equal(g.player.kits.mind.on, true);
    assert.ok((foe.leashed ?? 0) > 0);
    assert.equal(foe.leashBoost, undefined);
    assert.ok(Math.abs(g.player.kits.mind.left - (14 - 0.05)) < 1e-9);

    const bare = createGame(45);
    startCombat(bare, "scout");
    assert.ok(bare.enemy);
    if (bare.enemy.kits.mind) bare.enemy.kits.mind.cool = 999;
    const other = spark(bare.enemy.rooms[0]?.id ?? "e-pilot", "other", "enemy");
    other.leashed = 28;
    bare.crew.push(other);
    bare.player.kits.mind = {
      id: "mind",
      level: 3,
      power: 1,
      zoltan: 0,
      on: true,
      left: 28,
      cool: 0,
      target: other.id,
      aux: 0,
      ion: [5, 5, 5],
    };
    tickLeash(bare, 0.05);
    assert.equal(bare.player.kits.mind.on, false);
    assert.equal(other.leashed ?? 0, 0);
  });
});

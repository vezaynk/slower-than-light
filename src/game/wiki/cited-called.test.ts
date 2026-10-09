import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { installAugment } from "../extras/augments.ts";
import { startLeash } from "../extras/leash.ts";
import { claimPadTile } from "../crew-spots.ts";
import { recallSling, sendSling, installSling, tickSling } from "../extras/sling.ts";
import { armSpike, installSpike, launchSpike, toggleSpikePower } from "../extras/spike.ts";
import {
  DRONE_COOLDOWN_S,
  deploy,
  enemyDefenseIntercept,
  swarmIntercept,
  tickEnemyDrones,
  tickSwarm,
} from "../extras/swarm.ts";
import { COMBAT2, orbitLegSeconds } from "./cited-combat2.ts";
import { applyImpact, createGame, startCombat, step } from "../sim.ts";
import type { Game, Shot } from "../types.ts";
import { citedSellQuote, citedStock } from "./cited-stores.ts";

function fight(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.asteroid = false;
  g.asb = false;
  for (const w of [...g.player.weapons, ...g.enemy.weapons]) {
    w.enabled = false;
    w.target = null;
    w.charge = 0;
  }
  return g;
}

function park(ship: Game["player"]) {
  ship.systems.engines.level = 0;
  ship.systems.engines.power = 0;
  ship.systems.shields.level = 0;
  ship.systems.shields.power = 0;
  ship.shieldNow = 0;
  ship.zoltan = 0;
}

function shot(partial: Partial<Shot> & Pick<Shot, "kind" | "from" | "damage" | "targetRoom">): Shot {
  return {
    id: "probe",
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function swarmKit(g: Game, power: number) {
  g.player.parts = 3;
  g.player.kits.swarm = {
    id: "swarm",
    level: 4,
    power,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

function ensureFoe(g: Game) {
  const enemy = g.enemy;
  assert.ok(enemy);
  const spot = enemy.rooms.find((room) => room.id !== "e-pilot") ?? enemy.rooms[0];
  assert.ok(spot);
  let foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
  if (!foe) {
    foe = {
      id: "foe-probe",
      name: "Probe",
      side: "enemy",
      aboard: "enemy",
      hp: 100,
      maxHp: 100,
      room: spot.id,
      path: [],
      move: 0,
      think: 0,
      tone: 0,
      kin: "plain",
    };
    g.crew.push(foe);
  }
  foe.room = spot.id;
  foe.aboard = "enemy";
  foe.hp = Math.max(foe.hp, 1);
  return foe;
}

function ionSum(g: Game): number {
  const enemy = g.enemy;
  assert.ok(enemy);
  return Object.values(enemy.systems).reduce((sum, sys) => sum + sys.ion.length, 0);
}

describe("Zoltan Shield Bypass", () => {
  it("sells for 55 and Crystal Vengeance stays out of the catalog at a printed sell of 40", () => {
    const g = createGame(1);
    g.scrap = 500;
    assert.equal(installAugment(g, "vengeance"), false);
    assert.deepEqual(g.augments, []);
    assert.equal(g.scrap, 500);
    assert.equal(installAugment(g, "bypass"), true);
    assert.deepEqual(g.augments, ["bypass"]);
    assert.equal(g.scrap, 445);

    g.augments = ["vengeance", "bypass"];
    const quotes = Object.fromEntries(citedSellQuote(g).map((quote) => [quote.ref, quote]));
    assert.equal(quotes.vengeance?.scrap, 40);
    assert.equal(quotes.vengeance?.name, "Crystal Vengeance");
    assert.equal(quotes.bypass?.scrap, 27);

    const stock = citedStock(createGame(2));
    assert.equal(
      stock.some((item) => item.ref === "combat2" || item.ref === "ionintruder"),
      false,
    );
  });

  it("lets crew teleport and mind control through the bubble only when fitted", () => {
    const blocked = fight(3);
    blocked.scrap = 200;
    installSling(blocked);
    const sling = blocked.player.kits.sling;
    assert.ok(sling);
    sling.power = sling.level;
    blocked.enemy!.zoltan = 4;
    const room = blocked.enemy!.rooms[0]!.id;
    const before = blocked.crew.filter((c) => c.side === "player").map((c) => c.aboard);
    sendSling(blocked, room);
    assert.deepEqual(
      blocked.crew.filter((c) => c.side === "player").map((c) => c.aboard),
      before,
    );
    assert.equal(blocked.enemy!.zoltan, 4);
    assert.equal(sling.cool, 0);

    const open = fight(4);
    open.scrap = 200;
    open.augments = ["bypass"];
    installSling(open);
    const pad = open.player.kits.sling;
    assert.ok(pad);
    pad.power = pad.level;
    open.enemy!.zoltan = 4;
    // Crew Teleporter: a send needs someone standing in the teleporter room.
    const padRoom = open.player.rooms.find((r) => r.kit === "sling");
    assert.ok(padRoom);
    const rider = open.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(rider);
    rider.room = padRoom.id;
    rider.path = [];
    rider.pad = claimPadTile(padRoom, new Set()) ?? undefined;
    sendSling(open, open.enemy!.rooms[0]!.id);
    assert.ok(open.crew.some((c) => c.side === "player" && c.aboard === "enemy"));
    assert.equal(open.enemy!.zoltan, 4);
    tickSling(open, 20);
    recallSling(open);
    assert.equal(
      open.crew.some((c) => c.side === "player" && c.aboard === "enemy"),
      false,
    );
    assert.equal(open.enemy!.zoltan, 4);

    const mind = fight(5);
    mind.enemy!.zoltan = 5;
    // Mind Control, Overview: the hold needs a view. Level 2 Sensors shows the pilot.
    mind.player.systems.sensors.level = 2;
    const pilot = ensureFoe(mind);
    mind.player.kits.leash = {
      id: "leash",
      level: 1,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    startLeash(mind, pilot.id);
    assert.equal(pilot.leashed, undefined);
    assert.equal(mind.enemy!.zoltan, 5);

    mind.augments = ["bypass"];
    startLeash(mind, pilot.id);
    assert.equal(pilot.leashed, 14);
    assert.equal(mind.enemy!.zoltan, 5);

    const boarded = fight(6);
    boarded.enemy!.zoltan = 5;
    const foe = ensureFoe(boarded);
    foe.aboard = "player";
    boarded.player.kits.leash = {
      id: "leash",
      level: 1,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    startLeash(boarded, foe.id);
    assert.equal(foe.leashed, 14);
  });

  // Hacking: "Hacking drone cannot be launched at a ship with a Zoltan Shield, even with the Zoltan Shield Bypass
  // augmentation." No launch, so no part is spent with or without the augment (was: spent without it).
  it("never launches a hacking drone at a Zoltan Shield, spends no part, and never spends the bubble", () => {
    const bare = fight(7);
    bare.scrap = 80;
    bare.player.parts = 2;
    assert.equal(installSpike(bare), true);
    toggleSpikePower(bare);
    armSpike(bare, "shields");
    bare.enemy!.zoltan = 4;
    assert.equal(launchSpike(bare), false);
    assert.equal(bare.player.parts, 2);
    assert.equal(bare.player.kits.spike?.on, false);
    assert.equal(bare.enemy!.zoltan, 4);

    const fitted = fight(8);
    fitted.scrap = 80;
    fitted.player.parts = 2;
    fitted.augments = ["bypass"];
    assert.equal(installSpike(fitted), true);
    toggleSpikePower(fitted);
    armSpike(fitted, "shields");
    fitted.enemy!.zoltan = 4;
    assert.equal(launchSpike(fitted), false);
    assert.equal(fitted.player.parts, 2);
    assert.equal(fitted.player.kits.spike?.on, false);
    assert.equal(fitted.enemy!.zoltan, 4);
  });

  it("destroys a boarding drone on contact with or without the bypass", () => {
    for (const fitted of [false, true]) {
      const g = fight(fitted ? 9 : 10);
      if (fitted) g.augments = ["bypass"];
      swarmKit(g, 3);
      g.enemy!.zoltan = 3;
      assert.equal(deploy(g, "board"), true);
      const hp = g.crew.filter((c) => c.side === "enemy").reduce((sum, c) => sum + c.hp, 0);
      const bars = Object.values(g.enemy!.systems).reduce((sum, sys) => sum + sys.damage, 0);
      tickSwarm(g, 0.5);
      assert.equal(g.player.kits.swarm?.on, true);
      tickSwarm(g, 0.5);
      assert.equal(g.player.kits.swarm?.on, false);
      assert.equal(
        g.crew.filter((c) => c.side === "enemy").reduce((sum, c) => sum + c.hp, 0),
        hp,
      );
      assert.equal(Object.values(g.enemy!.systems).reduce((sum, sys) => sum + sys.damage, 0), bars);
      assert.equal(g.enemy!.zoltan, 3);
    }
  });

  it("stops an enemy teleporter party on a player bubble and lets one through when the bubble is down", () => {
    // Crew Teleporter, "Enemy Crew Teleporter": only a hull with a teleporter boards, and its crew walk to the
    // pads first, so this uses a Mantis ship that has one and runs the real loop (extras/sling.ts).
    function teleporterFight(seed: number): Game {
      for (let s = seed; s < seed + 400; s++) {
        const g = createGame(s);
        startCombat(g, "Mantis ship");
        if (!g.enemy?.kits.sling) continue;
        g.enemy.weapons = [];
        g.player.weapons = [];
        g.enemyEscape = null;
        g.asteroid = false;
        g.asb = false;
        return g;
      }
      throw new Error("no Mantis ship with a teleporter");
    }
    const boarded = (g: Game) => g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0);

    const held = teleporterFight(11);
    held.player.zoltan = 5;
    for (let i = 0; i < 20 * 20 && held.phase === "combat"; i++) {
      held.player.zoltan = 5;
      step(held, 0.05);
    }
    assert.equal(boarded(held), false);

    const open = teleporterFight(12);
    open.player.zoltan = 0;
    for (let i = 0; i < 40 * 20 && open.phase === "combat" && !boarded(open); i++) step(open, 0.05);
    assert.equal(boarded(open), true);
  });

  it("lets a player bomb through the bubble and still shrugs one that is not the player's", () => {
    const bare = fight(13);
    park(bare.enemy!);
    bare.enemy!.zoltan = 5;
    const room = bare.enemy!.rooms.find((item) => item.system);
    assert.ok(room?.system);
    bare.enemy!.systems[room.system].level = 4;
    bare.enemy!.systems[room.system].damage = 0;
    const hull = bare.enemy!.hull;
    applyImpact(bare, shot({ kind: "bomb", from: "player", damage: 2, targetRoom: room.id }));
    assert.equal(bare.enemy!.zoltan, 3);
    assert.equal(bare.enemy!.systems[room.system].damage, 0);
    assert.equal(bare.enemy!.hull, hull);

    const fitted = fight(14);
    park(fitted.enemy!);
    fitted.augments = ["bypass"];
    fitted.enemy!.zoltan = 5;
    const target = fitted.enemy!.rooms.find((item) => item.system);
    assert.ok(target?.system);
    fitted.enemy!.systems[target.system].level = 4;
    fitted.enemy!.systems[target.system].damage = 0;
    const fittedHull = fitted.enemy!.hull;
    applyImpact(fitted, shot({ kind: "bomb", from: "player", damage: 2, targetRoom: target.id }));
    assert.equal(fitted.enemy!.zoltan, 5);
    assert.equal(fitted.enemy!.systems[target.system].damage, 2);
    assert.equal(fitted.enemy!.hull, fittedHull);

    const ion = fight(15);
    park(ion.enemy!);
    ion.augments = ["bypass"];
    ion.enemy!.zoltan = 5;
    const ionRoom = ion.enemy!.rooms.find((item) => item.system);
    assert.ok(ionRoom?.system);
    applyImpact(ion, shot({ kind: "bomb", from: "player", damage: 0, ion: 2, targetRoom: ionRoom.id }));
    assert.equal(ion.enemy!.zoltan, 5);
    assert.equal(ion.enemy!.systems[ionRoom.system].ion.length, 0);

    const spent = fight(16);
    park(spent.enemy!);
    spent.enemy!.zoltan = 5;
    const spentRoom = spent.enemy!.rooms.find((item) => item.system);
    assert.ok(spentRoom);
    applyImpact(spent, shot({ kind: "bomb", from: "player", damage: 0, ion: 2, targetRoom: spentRoom.id }));
    assert.equal(spent.enemy!.zoltan, 1);

    const shrug = fight(17);
    park(shrug.enemy!);
    shrug.enemy!.zoltan = 5;
    const fireRoom = shrug.enemy!.rooms.find((item) => item.system);
    assert.ok(fireRoom);
    fireRoom.fire = 0;
    applyImpact(
      shrug,
      shot({ kind: "bomb", from: "player", damage: 0, fireChance: 1, defId: "firebomb", targetRoom: fireRoom.id }),
    );
    assert.equal(shrug.enemy!.zoltan, 5);
    assert.equal(fireRoom.fire, 0);

    const heal = fight(18);
    park(heal.enemy!);
    heal.augments = ["bypass"];
    heal.enemy!.zoltan = 5;
    const bay = heal.enemy!.rooms.find((item) => item.system);
    assert.ok(bay);
    const crew = heal.crew.find((member) => member.side === "player");
    assert.ok(crew);
    crew.aboard = "enemy";
    crew.room = bay.id;
    crew.hp = 10;
    crew.maxHp = 100;
    applyImpact(heal, shot({ kind: "bomb", from: "player", damage: 0, defId: "healburst", targetRoom: bay.id }));
    assert.equal(crew.hp, 100);
    assert.equal(heal.enemy!.zoltan, 5);

    const inbound = fight(19);
    park(inbound.player);
    inbound.augments = ["bypass"];
    inbound.player.zoltan = 5;
    inbound.player.systems.weapons.level = 4;
    inbound.player.systems.weapons.damage = 0;
    applyImpact(inbound, shot({ kind: "bomb", from: "enemy", damage: 2, targetRoom: "p-weapons" }));
    assert.equal(inbound.player.zoltan, 3);
    assert.equal(inbound.player.systems.weapons.damage, 0);
  });
});

describe("Crystal Vengeance", () => {
  function hammer(g: Game, hits: number, zoltan = 0) {
    park(g.player);
    park(g.enemy!);
    g.player.hull = 400;
    g.player.hullMax = 400;
    g.enemy!.shieldNow = 4;
    g.enemy!.zoltan = zoltan;
    const room = g.player.rooms.find((item) => item.id === "p-weapons") ?? g.player.rooms[0];
    assert.ok(room);
    for (const c of g.crew) {
      if (c.room === room.id) c.room = "p-medbay";
      c.stun = 0;
    }
    for (let i = 0; i < hits; i++) {
      applyImpact(g, shot({ kind: "laser", from: "enemy", damage: 1, targetRoom: room.id }));
    }
  }

  it("starts fitted on the Crystal cruisers", () => {
    assert.deepEqual(createGame(1, "crystal-a").augments, ["vengeance"]);
    assert.deepEqual(createGame(2, "crystal-b").augments, ["vengeance"]);
  });

  it("rolls a shard only after the player hull drops, ignoring regular shields", () => {
    const quiet = fight(20);
    const quietHull = quiet.enemy!.hull;
    hammer(quiet, 40, 5);
    assert.equal(quiet.enemy!.hull, quietHull);
    assert.equal(quiet.enemy!.zoltan, 5);
    assert.equal(quiet.enemy!.shieldNow, 4);

    const g = fight(21);
    g.augments = ["vengeance"];
    const hull = g.enemy!.hull;
    const damage = Object.values(g.enemy!.systems).reduce((sum, sys) => sum + sys.damage, 0);
    hammer(g, 100, 0);
    assert.ok(g.enemy!.hull < hull);
    assert.equal(g.enemy!.shieldNow, 4);
    assert.equal(
      Object.values(g.enemy!.systems).reduce((sum, sys) => sum + sys.damage, 0),
      damage,
    );
    assert.equal(
      g.enemy!.rooms.reduce((sum, room) => sum + room.breach, 0),
      0,
    );
    assert.ok(g.crew.every((c) => (c.stun ?? 0) === 0));

    const bubble = fight(22);
    bubble.augments = ["vengeance"];
    const bubbleHull = bubble.enemy!.hull;
    hammer(bubble, 100, 40);
    assert.ok((bubble.enemy!.zoltan ?? 0) < 40);
    assert.equal(bubble.enemy!.hull, bubbleHull);
    assert.equal(bubble.enemy!.shieldNow, 4);
  });

  it("is shot down by an enemy defense drone and by your own", () => {
    const mark1 = fight(23);
    mark1.enemy!.systems.engines.level = 0;
    mark1.enemy!.systems.shields.level = 0;
    mark1.enemy!.shieldNow = 0;
    mark1.enemy!.zoltan = 0;
    mark1.enemy!.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "ward",
      on: true,
      aux: 0,
    };
    assert.equal(
      enemyDefenseIntercept(mark1, { kind: "laser", from: "player", defId: "vengeance" }),
      true,
    );
    assert.equal(mark1.enemy!.kits.swarm?.cool, DRONE_COOLDOWN_S.ward);

    const mark2 = fight(24);
    mark2.enemy!.kits.swarm = {
      id: "swarm",
      level: 3,
      power: 3,
      left: 0,
      cool: 0,
      target: "ward2",
      on: true,
      aux: 0,
    };
    assert.equal(
      enemyDefenseIntercept(mark2, { kind: "laser", from: "player", defId: "vengeance" }),
      true,
    );
    assert.equal(mark2.enemy!.kits.swarm?.cool, DRONE_COOLDOWN_S.ward2);

    const striker = fight(25);
    striker.enemy!.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "striker",
      on: true,
      aux: 0,
    };
    assert.equal(
      enemyDefenseIntercept(striker, { kind: "laser", from: "player", defId: "vengeance" }),
      false,
    );
    assert.equal(striker.enemy!.kits.swarm?.cool, 0);

    const own = fight(26);
    swarmKit(own, 2);
    assert.equal(deploy(own, "ward"), true);
    assert.equal(swarmIntercept(own, { kind: "laser", from: "player", defId: "vengeance" }), true);
    assert.equal(own.player.kits.swarm?.cool, DRONE_COOLDOWN_S.ward);
  });

  it("does not answer a hit on the enemy hull", () => {
    const g = fight(27);
    g.augments = ["vengeance"];
    park(g.enemy!);
    const room = g.enemy!.rooms.find((item) => item.system);
    assert.ok(room);
    const hull = g.enemy!.hull;
    const player = g.player.hull;
    applyImpact(g, shot({ kind: "laser", from: "player", damage: 1, targetRoom: room.id }));
    assert.equal(g.enemy!.hull, hull - 1);
    assert.equal(g.player.hull, player);
  });
});

describe("Combat Drone Mark II and the Ion Intruder", () => {
  it("deploys Mark II at power 4 and fires when the orbit leg finishes", () => {
    const low = fight(31);
    swarmKit(low, 3);
    assert.equal(deploy(low, "combat2"), true);
    const held = low.enemy!.hull;
    low.shots = [];
    tickSwarm(low, 30);
    assert.equal(low.shots.length, 0);
    assert.equal(low.enemy!.hull, held);

    const g = fight(32);
    swarmKit(g, 4);
    assert.equal(deploy(g, "combat2"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    kit.heading = 0;
    kit.bearing = 180;
    kit.left = orbitLegSeconds(0, 180, COMBAT2.speed);
    kit.aux = 0;
    g.shots = [];
    tickSwarm(g, kit.left - 0.01);
    assert.equal(g.shots.length, 0);
    tickSwarm(g, 0.01);
    const shot = g.shots[0];
    assert.ok(shot);
    assert.equal(shot.kind, "laser");
    assert.equal(shot.damage, COMBAT2.damage);
    assert.equal(shot.fireChance, COMBAT2.fireChance);
    assert.equal(shot.from, "player");
    assert.ok(g.enemy!.rooms.some((room) => room.id === shot.targetRoom));
  });

  it("pulses inside 8.2 to 10 seconds, ions a live system, and stuns enemy crew including mind-controlled ones", () => {
    // Boarding, "Stun effect": the Ion Intruder stuns enemy units, including those under the player's mind control, for 6 seconds.
    // Drone Control, Ion Intruder: a friendly boarder is not stunned, even if that boarder is mind-controlled.
    const g = fight(33);
    swarmKit(g, 3);
    assert.equal(deploy(g, "ionintruder"), true);
    const enemy = g.enemy!;
    const systems = enemy.rooms.filter((room) => room.system);
    assert.ok(systems.length >= 2);
    const room = systems[0]!;
    assert.ok(room.system);
    if (enemy.systems[room.system].damage >= enemy.systems[room.system].level) {
      enemy.systems[room.system].level = enemy.systems[room.system].damage + 1;
    }
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    kit.room = room.id;
    kit.power = 3;
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    const other = g.crew.find((c) => c.side === "enemy" && c.hp > 0 && c !== foe);
    const friend = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(foe && other && friend);
    foe.room = room.id;
    foe.aboard = "enemy";
    foe.stun = 0;
    foe.leashed = undefined;
    other.room = room.id;
    other.aboard = "enemy";
    other.stun = 0;
    other.leashed = 8;
    friend.room = room.id;
    friend.aboard = "enemy";
    friend.stun = 0;
    friend.leashed = 8;
    enemy.systems[room.system].ion = [];
    // No loadout: tickEnemyDrones returns before it can walk these drones off the pulsed room.
    const bay = enemy.kits.swarm ?? {
      id: "swarm" as const,
      level: 1,
      power: 0,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    delete bay.loadout;
    const personnel = {
      id: "ed-personnel",
      kind: "personnel",
      alive: true,
      powered: true,
      aux: 0,
      cool: 0,
      hp: 150,
      room: room.id,
      stun: 0,
    };
    const boardDrone = {
      id: "ed-board",
      kind: "board",
      alive: true,
      powered: true,
      aux: 0,
      cool: 0,
      fly: 0,
      hp: 150,
      room: room.id,
      stun: 0,
    };
    const ionDrone = {
      id: "ed-ion",
      kind: "ionintruder",
      alive: true,
      powered: true,
      aux: 0,
      cool: 0,
      fly: 0,
      hp: 125,
      room: room.id,
      stun: 0,
    };
    const striker = {
      id: "ed-striker",
      kind: "striker",
      alive: true,
      powered: true,
      aux: 0,
      cool: 0,
      stun: 0,
    };
    bay.drones = [personnel, boardDrone, ionDrone, striker];
    enemy.kits.swarm = bay;

    tickSwarm(g, 8.19);
    assert.equal(enemy.systems[room.system].ion.length, 0);
    assert.ok(kit.left >= 8.2 && kit.left <= 10);
    assert.equal(kit.room, room.id);
    tickSwarm(g, 1.86);
    assert.equal(enemy.systems[room.system].ion.length, 3);
    assert.ok(enemy.systems[room.system].ion.every((point) => point === 5));
    assert.equal(foe.stun, 6);
    assert.equal(other.stun, 6);
    assert.equal(friend.stun, 0);
    assert.equal(personnel.stun, 6);
    assert.equal(personnel.ionT, undefined);
    assert.equal(boardDrone.stun, 0);
    assert.equal(ionDrone.stun, 0);
    assert.equal(striker.stun, 0);
    // The pulse lands in this room, then a walk is queued. The room does not change in the same call.
    assert.equal(kit.room, room.id);
    assert.ok((kit.path ?? []).length > 0);
    for (const otherRoom of systems) {
      if (!otherRoom.system || otherRoom.system === room.system) continue;
      assert.equal(enemy.systems[otherRoom.system].ion.length, 0);
    }
  });

  it("does not ionize a destroyed system and freezes the timer while unpowered", () => {
    const dead = fight(34);
    swarmKit(dead, 3);
    assert.equal(deploy(dead, "ionintruder"), true);
    const systems = dead.enemy!.rooms.filter((room) => room.system);
    assert.ok(systems.length >= 2);
    const room = systems[0]!;
    assert.ok(room.system);
    const kit = dead.player.kits.swarm;
    assert.ok(kit);
    kit.room = room.id;
    kit.power = 3;
    const sys = dead.enemy!.systems[room.system];
    sys.damage = sys.level;
    sys.ion = [];
    const foe = dead.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe);
    foe.room = room.id;
    foe.aboard = "enemy";
    foe.stun = 0;
    foe.leashed = undefined;
    tickSwarm(dead, 8.19);
    tickSwarm(dead, 1.86);
    assert.equal(sys.ion.length, 0);
    assert.equal(foe.stun, 0);
    assert.equal(kit.room, room.id);
    assert.ok((kit.path ?? []).length > 0);

    const frozen = fight(35);
    swarmKit(frozen, 2);
    assert.equal(deploy(frozen, "ionintruder"), true);
    const cold = frozen.player.kits.swarm;
    assert.ok(cold);
    cold.power = 2;
    tickSwarm(frozen, 20);
    assert.equal(ionSum(frozen), 0);
    assert.ok(cold.left >= 8.2 && cold.left <= 10);
    cold.power = 3;
    tickSwarm(frozen, 4);
    const left = cold.left;
    const aux = cold.aux;
    assert.equal(ionSum(frozen), 0);
    cold.power = 0;
    tickSwarm(frozen, 10);
    assert.equal(cold.left, left);
    assert.equal(cold.aux, aux);
    assert.equal(ionSum(frozen), 0);
    cold.power = 3;
    tickSwarm(frozen, 4);
    assert.equal(ionSum(frozen), 0);
    assert.ok(Math.abs(cold.aux - 8) < 1e-9);
  });

  it("stuns a hostile interior drone for 6 seconds and leaves boarding drones and ion intruders free", () => {
    // Boarding, "Boarding Drones": "The Ion Intruder will ionize a system, stunning all hostile crew and drones for 6 seconds, and then move to another system."
    // Drone Control, Ion Intruder: "The stun does not affect friendly boarders, Boarding Drones, or other Ion Intruders."
    const g = createGame(9);
    startCombat(g, "scout");
    const room = g.player.rooms.find((item) => item.system === "weapons");
    assert.ok(room?.system);
    const sys = g.player.systems[room.system];
    if (sys.damage >= sys.level) sys.level = sys.damage + 1;
    const friend = g.crew.find((c) => c.side === "player" && c.hp > 0);
    const boarder = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(friend && boarder);
    friend.room = room.id;
    friend.aboard = "player";
    friend.stun = 0;
    boarder.room = room.id;
    boarder.aboard = "player";
    boarder.stun = 0;
    g.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "personnel",
      on: true,
      aux: 0,
      hp: 150,
      room: room.id,
      stun: 0,
    };
    const enemy = g.enemy;
    assert.ok(enemy);
    const boardUnit = {
      id: "ed-board",
      kind: "board",
      alive: true,
      powered: true,
      aux: 0,
      cool: 0,
      fly: 0,
      room: room.id,
      hp: 150,
      left: 1000,
      stun: 0,
    };
    const otherIon = {
      id: "ed-ion-2",
      kind: "ionintruder",
      alive: true,
      powered: true,
      aux: 0,
      cool: 0,
      fly: 0,
      room: room.id,
      hp: 125,
      left: 1000,
      stun: 0,
    };
    enemy.parts = 8;
    enemy.kits.swarm = {
      id: "swarm",
      level: 9,
      power: 9,
      left: 0,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
      loadout: ["ionintruder"],
      drones: [
        {
          id: "ed-ion",
          kind: "ionintruder",
          alive: true,
          powered: true,
          aux: 0,
          cool: 0,
          fly: 0,
          room: room.id,
          hp: 125,
          left: 0.01,
          stun: 0,
        },
        boardUnit,
        otherIon,
      ],
    };
    tickEnemyDrones(g, 0.02);
    assert.equal(g.player.kits.swarm.stun, 6);
    assert.equal(g.player.kits.swarm.ionT, undefined);
    assert.equal(boardUnit.stun, 0);
    assert.equal(otherIon.stun, 0);
    assert.equal(friend.stun, 6);
    assert.equal(boarder.stun, 0);
  });
});

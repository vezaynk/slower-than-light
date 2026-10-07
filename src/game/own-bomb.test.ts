import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aim, applyImpact, armWeapon, createGame, evasionPercent, fireReady, startCombat, step } from "./sim.ts";
import type { Game, Shot } from "./types.ts";

function quiet(g: Game) {
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.enemy.weapons = [];
  g.player.systems.engines.power = 0;
}

function mount(g: Game, defId: string, charge = 1) {
  g.player.weapons = [{ uid: "b", defId, charge, enabled: true, autofire: false, target: null }];
  g.player.systems.weapons.level = Math.max(g.player.systems.weapons.level, 1);
  g.player.systems.weapons.power = 1;
  g.missiles = 4;
  g.targeting = true;
  g.armed = "b";
}

function bomb(partial: Partial<Shot> & Pick<Shot, "targetRoom" | "defId">): Shot {
  return {
    id: "s",
    kind: "bomb",
    from: "player",
    damage: 0,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function sureEvade(g: Game, ship: "player" | "enemy") {
  const hull = ship === "player" ? g.player : g.enemy!;
  hull.systems.engines.level = 8;
  hull.systems.engines.power = 8;
  hull.systems.engines.damage = 0;
  hull.systems.pilot.level = Math.max(1, hull.systems.pilot.level);
  hull.systems.pilot.damage = 0;
  hull.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
  const engines = hull.rooms.find((r) => r.system === "engines");
  const pilot = hull.rooms.find((r) => r.system === "pilot");
  const crew = g.crew.filter((c) => c.aboard === ship && c.hp > 0);
  if (engines && crew[0]) {
    crew[0].room = engines.id;
    crew[0].path = [];
  }
  if (pilot && crew[1]) {
    crew[1].room = pilot.id;
    crew[1].path = [];
  }
}

describe("bombs aimed at your own ship", () => {
  it("heals your medbay crew and does not heal the enemy", () => {
    const g = createGame(11);
    quiet(g);
    mount(g, "healburst");
    const bay = g.player.rooms.find((r) => r.system === "medbay");
    assert.ok(bay);
    const crew = g.crew.find((c) => c.side === "player");
    assert.ok(crew);
    crew.room = bay.id;
    crew.hp = 20;
    const foe = g.crew.find((c) => c.side === "enemy");
    const foeHp = foe?.hp;
    const hull = g.player.hull;
    g.player.weapons[0].charge = 0;
    aim(g, bay.id);
    assert.equal(g.player.weapons[0].own, true);
    assert.equal(g.player.weapons[0].target, bay.id);
    assert.equal(g.shots.length, 0);
    g.player.weapons[0].charge = 1;
    fireReady(g);
    assert.equal(g.shots[0]?.own, true);
    assert.equal(g.shots[0]?.targetRoom, bay.id);
    assert.equal(g.player.weapons[0].target, null);
    assert.equal(g.player.weapons[0].own, false);
    assert.equal(g.missiles, 3);
    for (let i = 0; i < 40 && g.shots.length; i++) step(g, 0.05);
    assert.equal(g.shots.length, 0);
    assert.equal(crew.hp, crew.maxHp);
    assert.equal(g.player.hull, hull);
    if (foe) assert.equal(foe.hp, foeHp);
  });

  it("repairs your own system even when evasion is full, and a Healing Burst can still miss theirs", () => {
    const g = createGame(12);
    quiet(g);
    sureEvade(g, "player");
    assert.equal(evasionPercent(g, g.player, "player"), 100);
    const bay = g.player.rooms.find((r) => r.system === "medbay");
    assert.ok(bay && bay.system);
    g.player.systems[bay.system].damage = 3;
    bay.fire = 1;
    bay.breach = 1;
    const hull = g.player.hull;
    applyImpact(g, bomb({ defId: "repairburst", targetRoom: bay.id, own: true }));
    assert.equal(g.player.systems[bay.system].damage, 0);
    assert.equal(bay.fire, 1);
    assert.equal(bay.breach, 1);
    assert.equal(g.player.hull, hull);

    sureEvade(g, "enemy");
    assert.equal(evasionPercent(g, g.enemy!, "enemy"), 100);
    const foe = g.crew.find((c) => c.side === "player");
    assert.ok(foe);
    const enemyRoom = g.enemy!.rooms.find((r) => r.system);
    assert.ok(enemyRoom);
    foe.aboard = "enemy";
    foe.room = enemyRoom.id;
    foe.hp = 20;
    applyImpact(g, bomb({ defId: "healburst", targetRoom: enemyRoom.id }));
    assert.equal(foe.hp, 20);
  });

  it("lands a damage bomb on your ship without touching the hull, and a laser cannot aim there", () => {
    const g = createGame(13);
    quiet(g);
    sureEvade(g, "player");
    const bay = g.player.rooms.find((r) => r.system === "medbay");
    assert.ok(bay && bay.system);
    // Small Bomb prints 2 system damage. A level-1 medbay can only hold 1, so the bar count is raised first.
    g.player.systems[bay.system].level = 2;
    const hull = g.player.hull;
    applyImpact(g, bomb({ defId: "smallbomb", damage: 2, targetRoom: bay.id, own: true }));
    assert.equal(g.player.systems[bay.system].damage, 2);
    assert.equal(g.player.hull, hull);

    g.player.weapons = [{ uid: "gun", defId: "lineburst", charge: 0, enabled: true, autofire: false, target: null }];
    g.targeting = true;
    g.armed = "gun";
    armWeapon(g, "gun");
    aim(g, bay.id);
    assert.equal(g.player.weapons[0].target, null);
    assert.equal(g.shots.length, 0);
    const enemyRoom = g.enemy!.rooms[0];
    aim(g, enemyRoom.id);
    assert.equal(g.player.weapons[0].target, enemyRoom.id);
    assert.equal(g.player.weapons[0].own, false);
  });

  it("puts 4 ion on the targeted system, ignores shields and hull, and a bubble stops it", () => {
    const g = createGame(14);
    quiet(g);
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.systems.engines.power = 0;
    const room = enemy.rooms.find((r) => r.system === "weapons") ?? enemy.rooms.find((r) => r.system);
    assert.ok(room?.system);
    enemy.systems.shields.level = 4;
    enemy.systems.shields.power = 4;
    enemy.shieldNow = 2;
    const hull = enemy.hull;
    const hp = g.crew.map((c) => c.hp);
    applyImpact(g, bomb({ defId: "ionbomb", ion: 4, targetRoom: room.id }));
    assert.equal(enemy.systems[room.system].ion.length, 4);
    assert.equal(enemy.systems[room.system].damage, 0);
    assert.equal(enemy.hull, hull);
    assert.equal(enemy.shieldNow, 2);
    assert.deepEqual(
      g.crew.map((c) => c.hp),
      hp,
    );

    enemy.zoltan = 5;
    enemy.systems[room.system].ion = [];
    applyImpact(g, bomb({ defId: "ionbomb", ion: 4, targetRoom: room.id }));
    assert.equal(enemy.zoltan, 0);
    assert.equal(enemy.systems[room.system].ion.length, 0);
    assert.equal(enemy.hull, hull);
  });

  it("stuns every crew member and drone in the room for 15 seconds, and a bubble stops that", () => {
    const g = createGame(15);
    quiet(g);
    const room = g.player.rooms.find((r) => r.system === "weapons");
    const other = g.player.rooms.find((r) => r.id !== room?.id);
    assert.ok(room?.system && other);
    const crew = g.crew.filter((c) => c.side === "player" && c.hp > 0);
    assert.ok(crew.length >= 2);
    crew[0].room = room.id;
    crew[0].aboard = "player";
    crew[1].room = other.id;
    crew[1].aboard = "player";
    g.player.systems.shields.level = 4;
    g.player.systems.shields.power = 4;
    g.player.shieldNow = 2;
    g.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "patch",
      on: true,
      aux: 0,
      room: room.id,
      hp: 25,
    };
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.kits.swarm = {
      id: "swarm",
      level: 3,
      power: 3,
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
          room: room.id,
          hp: 125,
        },
        {
          id: "ed-beam",
          kind: "beam",
          alive: true,
          powered: true,
          aux: 0,
          cool: 0,
          room: room.id,
        },
      ],
    };
    const hull = g.player.hull;
    const hp = crew[0].hp;
    applyImpact(g, bomb({ defId: "stunbomb", ion: 1, from: "enemy", targetRoom: room.id }));
    assert.equal(g.player.systems[room.system].ion.length, 1);
    assert.equal(g.player.systems[room.system].damage, 0);
    assert.ok((crew[0].stun ?? 0) >= 15);
    assert.equal(crew[1].stun ?? 0, 0);
    assert.ok((g.player.kits.swarm.stun ?? 0) >= 15);
    assert.ok((enemy.kits.swarm.drones?.[0].stun ?? 0) >= 15);
    assert.equal(enemy.kits.swarm.drones?.[1].stun ?? 0, 0);
    assert.equal(g.player.hull, hull);
    assert.equal(crew[0].hp, hp);
    assert.equal(g.player.shieldNow, 2);

    g.player.zoltan = 5;
    g.player.systems[room.system].ion = [];
    crew[0].stun = 0;
    g.player.kits.swarm.stun = 0;
    enemy.kits.swarm.drones[0].stun = 0;
    applyImpact(g, bomb({ defId: "stunbomb", ion: 1, from: "enemy", targetRoom: room.id }));
    assert.equal(g.player.zoltan, 3);
    assert.equal(g.player.systems[room.system].ion.length, 0);
    assert.equal(crew[0].stun ?? 0, 0);
    assert.equal(g.player.kits.swarm.stun ?? 0, 0);
    assert.equal(enemy.kits.swarm.drones[0].stun ?? 0, 0);
  });
});

describe("ion stunner", () => {
  it("stuns crew and drones in the hit room for 5 seconds, and a shield bubble does not", () => {
    // Boarding, "Stun effect": "Ion Stunner (5 seconds stun)" on crewmembers and drones in the room.
    const g = createGame(16);
    quiet(g);
    const room = g.player.rooms.find((r) => r.system === "weapons");
    const other = g.player.rooms.find((r) => r.id !== room?.id);
    assert.ok(room?.system && other);
    const crew = g.crew.filter((c) => c.side === "player" && c.hp > 0);
    assert.ok(crew.length >= 2);
    crew[0].room = room.id;
    crew[0].aboard = "player";
    crew[0].stun = 0;
    crew[1].room = other.id;
    crew[1].aboard = "player";
    crew[1].stun = 0;
    g.player.shieldNow = 0;
    g.player.systems.shields.power = 0;
    g.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "patch",
      on: true,
      aux: 0,
      room: room.id,
      hp: 25,
    };
    const shot: Shot = {
      id: "stunner-shot",
      kind: "ion",
      from: "enemy",
      damage: 0,
      ion: 1,
      fireChance: 0,
      breachChance: 0,
      wait: 0,
      t: 1,
      duration: 1,
      defId: "stunner",
      targetRoom: room.id,
    };
    applyImpact(g, shot);
    assert.equal(crew[0].stun, 5);
    assert.equal(crew[1].stun ?? 0, 0);
    assert.equal(g.player.kits.swarm.stun, 5);
    assert.equal(g.player.systems[room.system].ion.length, 1);

    crew[0].stun = 0;
    g.player.kits.swarm.stun = 0;
    g.player.shieldNow = 1;
    applyImpact(g, { ...shot, id: "stunner-shield" });
    assert.equal(crew[0].stun ?? 0, 0);
    assert.equal(g.player.kits.swarm.stun ?? 0, 0);
  });
});

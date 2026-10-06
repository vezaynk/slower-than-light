import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, createGame, startCombat } from "../sim.ts";
import type { Crew, Room, Shot } from "../types.ts";
import { systemlessHull } from "./cited-weapons.ts";

function shot(partial: Partial<Shot> & Pick<Shot, "kind" | "from" | "damage">): Shot {
  return {
    id: "s",
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: "",
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function fight() {
  const g = createGame(7);
  startCombat(g, "scout");
  const enemy = g.enemy;
  assert.ok(enemy);
  enemy.systems.engines.power = 0;
  enemy.shieldNow = 0;
  enemy.zoltan = 0;
  enemy.hull = 30;
  const system = enemy.rooms.find((room) => room.system && !room.kit);
  assert.ok(system?.system);
  const src = enemy.rooms[0];
  const empty: Room = { ...src, id: "e-hold", title: "Hold", system: null, kit: undefined, x: 30, y: 0 };
  const kitRoom: Room = { ...src, id: "e-kit", title: "Cloak", system: null, kit: "veil", x: 32, y: 0 };
  enemy.rooms.push(empty, kitRoom);
  const crew = g.crew.find((member) => member.hp > 0);
  assert.ok(crew);
  crew.aboard = "enemy";
  crew.side = "enemy";
  crew.hp = 100;
  crew.maxHp = 100;
  return { g, enemy, system, empty, kitRoom, crew };
}

function park(crew: Crew, roomId: string) {
  crew.room = roomId;
  crew.hp = 100;
}

describe("systemless hull damage", () => {
  it("stores the printed hull figures", () => {
    assert.equal(systemlessHull("hullsmash"), 2);
    assert.equal(systemlessHull("hullsmash2"), 2);
    assert.equal(systemlessHull("hullbeam"), 2);
    assert.equal(systemlessHull("hullmissile"), 4);
    assert.equal(systemlessHull("burst2"), null);
    assert.equal(systemlessHull(undefined), null);
  });

  it("deals 2 hull and 15 crew damage from a Hull Laser on an empty room", () => {
    const { g, enemy, system, empty, crew } = fight();
    const sys = system.system;
    assert.ok(sys);
    const before = enemy.systems[sys].damage;
    park(crew, system.id);
    applyImpact(g, shot({ kind: "laser", from: "player", damage: 1, defId: "hullsmash", targetRoom: system.id }));
    assert.equal(enemy.hull, 29);
    assert.equal(enemy.systems[sys].damage, before + 1);
    assert.equal(crew.hp, 85);

    enemy.hull = 30;
    park(crew, empty.id);
    applyImpact(g, shot({ kind: "laser", from: "player", damage: 1, defId: "hullsmash", targetRoom: empty.id }));
    assert.equal(enemy.hull, 28);
    assert.equal(crew.hp, 85);

    enemy.hull = 30;
    park(crew, empty.id);
    applyImpact(g, shot({ kind: "laser", from: "player", damage: 1, defId: "hullsmash2", targetRoom: empty.id }));
    assert.equal(enemy.hull, 28);
    assert.equal(crew.hp, 85);

    enemy.hull = 30;
    park(crew, empty.id);
    applyImpact(g, shot({ kind: "laser", from: "player", damage: 1, defId: "burst2", targetRoom: empty.id }));
    assert.equal(enemy.hull, 29);
    assert.equal(crew.hp, 85);
  });

  it("deals 4 hull from a Hull Missile and keeps crew on the system-room 2", () => {
    const { g, enemy, system, empty, kitRoom, crew } = fight();
    const sys = system.system;
    assert.ok(sys);
    const before = enemy.systems[sys].damage;
    park(crew, system.id);
    applyImpact(g, shot({ kind: "missile", from: "player", damage: 2, defId: "hullmissile", targetRoom: system.id }));
    assert.equal(enemy.hull, 28);
    assert.equal(enemy.systems[sys].damage, before + 2);
    assert.equal(crew.hp, 70);

    enemy.hull = 30;
    park(crew, empty.id);
    applyImpact(g, shot({ kind: "missile", from: "player", damage: 2, defId: "hullmissile", targetRoom: empty.id }));
    assert.equal(enemy.hull, 26);
    assert.equal(crew.hp, 70);

    enemy.hull = 30;
    park(crew, kitRoom.id);
    applyImpact(g, shot({ kind: "missile", from: "player", damage: 2, defId: "hullmissile", targetRoom: kitRoom.id }));
    assert.equal(enemy.hull, 28);
    assert.equal(crew.hp, 70);
  });

  it("deals 2 hull from a Hull Beam on an empty room and 1 through one shield", () => {
    const { g, enemy, system, empty, crew } = fight();
    const sys = system.system;
    assert.ok(sys);
    const before = enemy.systems[sys].damage;
    park(crew, system.id);
    applyImpact(
      g,
      shot({
        kind: "beam",
        from: "player",
        damage: 1,
        defId: "hullbeam",
        targetRoom: system.id,
        beamRooms: [system.id],
      }),
    );
    assert.equal(enemy.hull, 29);
    assert.equal(enemy.systems[sys].damage, before + 1);
    assert.equal(crew.hp, 85);

    enemy.hull = 30;
    enemy.systems[sys].damage = before;
    park(crew, empty.id);
    applyImpact(
      g,
      shot({
        kind: "beam",
        from: "player",
        damage: 1,
        defId: "hullbeam",
        targetRoom: empty.id,
        beamRooms: [empty.id, system.id],
      }),
    );
    assert.equal(enemy.hull, 27);
    assert.equal(enemy.systems[sys].damage, before + 1);
    assert.equal(crew.hp, 85);

    enemy.hull = 30;
    enemy.systems[sys].damage = before;
    enemy.shieldNow = 1;
    park(crew, empty.id);
    const other = g.crew.find((member) => member !== crew && member.hp > 0);
    if (other) {
      other.aboard = "enemy";
      other.room = system.id;
      other.hp = 100;
    }
    applyImpact(
      g,
      shot({
        kind: "beam",
        from: "player",
        damage: 1,
        defId: "hullbeam",
        targetRoom: system.id,
        beamRooms: [system.id, empty.id],
      }),
    );
    assert.equal(enemy.shieldNow, 1);
    assert.equal(enemy.systems[sys].damage, before);
    assert.equal(enemy.hull, 29);
    assert.equal(crew.hp, 85);
    if (other) assert.equal(other.hp, 100);

    enemy.hull = 30;
    enemy.shieldNow = 2;
    park(crew, empty.id);
    applyImpact(
      g,
      shot({
        kind: "beam",
        from: "player",
        damage: 1,
        defId: "hullbeam",
        targetRoom: empty.id,
        beamRooms: [empty.id],
      }),
    );
    assert.equal(enemy.hull, 30);
    assert.equal(crew.hp, 100);
    assert.match(g.log[0] ?? "", /skids off/);
  });
});

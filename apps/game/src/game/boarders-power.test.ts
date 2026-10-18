import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyImpact,
  commitJump,
  createGame,
  enterHiddenCrystal,
  startCombat,
  step,
} from "./sim.ts";
import type { DroneUnit, Game, Kit, Shot } from "./types.ts";
import { hurtRoomDrones, roomDroneHp } from "./extras/swarm.ts";
import { systemUnderBoarders } from "./extras/sabotage.ts";
import { closeFight } from "./wiki/surrender.ts";

function unit(kind: string, extra: Partial<DroneUnit> = {}): DroneUnit {
  return {
    id: extra.id ?? kind,
    kind,
    alive: true,
    powered: true,
    aux: 0,
    cool: 0,
    hp: kind === "BOARDER_ION" ? 125 : kind === "COMBAT_1" ? undefined : 150,
    fly: kind === "BOARDER" || kind === "BOARDER_ION" ? 0 : undefined,
    ...extra,
  };
}

function mount(g: Game, drones: DroneUnit[]) {
  assert.ok(g.enemy);
  g.enemy.kits.drones = {
    id: "drones",
    level: 8,
    power: 8,
    left: 0,
    cool: 0,
    target: null,
    on: true,
    aux: 0,
    loadout: drones.map((d) => d.kind),
    drones,
  } satisfies Kit;
}

function quietFight(seed = 4, tier = "scout"): Game {
  const g = createGame(seed);
  g.player.weapons = [];
  startCombat(g, tier);
  assert.ok(g.enemy);
  g.enemy.weapons = [];
  g.enemy.boards = false;
  g.boardTimer = 0;
  g.enemyEscape = null;
  g.enemySurrender = null;
  g.fightEvent = null;
  g.pending = null;
  return g;
}

function park(g: Game, room = "p-pilot") {
  for (const c of g.crew) {
    if (c.side !== "player" || c.hp <= 0) continue;
    c.room = room;
    c.path = [];
    c.aboard = "player";
  }
}

function destroy(g: Game) {
  assert.ok(g.enemy);
  g.enemy.hull = 0;
  step(g, 0.05);
  assert.equal(g.enemy, null);
  assert.equal(g.wreck, null);
}

function ticks(g: Game, seconds: number) {
  for (let t = 0; t < seconds - 1e-9; t += 0.05) step(g, 0.05);
}

function quietDest(g: Game): string {
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here?.links[0]);
  const dest = g.beacons.find((b) => b.id === here.links[0]);
  assert.ok(dest);
  dest.resolved = true;
  dest.kind = "empty";
  g.fuel = 5;
  g.flee = 1;
  return dest.id;
}

function stunBomb(room: string): Shot {
  return {
    id: "stun",
    kind: "bomb",
    from: "player",
    own: true,
    damage: 0,
    ion: 1,
    fireChance: 0,
    breachChance: 0,
    targetRoom: room,
    defId: "BOMB_STUN",
    wait: 0,
    t: 1,
    duration: 1,
  };
}

describe("boarding drones lose power when that hull is destroyed", () => {
  it("keeps a landed boarder and ion intruder, unpowered, and drops drones still outside", () => {
    const g = quietFight();
    park(g);
    const board = unit("BOARDER", { id: "landed", room: "p-weapons" });
    const ion = unit("BOARDER_ION", { id: "ion", room: "p-shields" });
    const flying = unit("BOARDER", { id: "flying", room: undefined, fly: 2 });
    const orbiter = unit("COMBAT_1", { id: "orb" });
    const dead = unit("BOARDER", { id: "dead", room: "p-oxygen", alive: false });
    mount(g, [board, ion, flying, orbiter, dead]);
    const weapons = g.player.systems.weapons;
    const shields = g.player.systems.shields;
    weapons.damage = 0;
    shields.damage = 0;
    shields.ion = [];
    destroy(g);
    assert.equal(g.boarded?.length, 2);
    assert.equal(board.powered, false);
    assert.equal(ion.powered, false);
    assert.equal(board.room, "p-weapons");
    assert.equal(ion.room, "p-shields");
    assert.equal(board.alive, true);
    assert.deepEqual(
      roomDroneHp(g.player, g)
        .map((mark) => mark.room)
        .sort(),
      ["p-shields", "p-weapons"],
    );
    assert.equal(systemUnderBoarders(g, g.player, "player", "weapons"), false);
    assert.equal(systemUnderBoarders(g, g.player, "player", "shields"), false);

    board.fix = 12.4;
    ion.aux = 0.95;
    ion.left = 1;
    g.paused = false;
    g.phase = "map";
    ticks(g, 1);
    assert.equal(weapons.damage, 0);
    assert.equal(shields.ion.length, 0);
    assert.equal(board.room, "p-weapons");
    assert.equal(ion.room, "p-shields");
    assert.equal(board.hp, 150);
    assert.equal(board.powered, false);
    assert.equal(g.boarded?.length, 2);
  });

  it("can still be destroyed by your crew, and does not hit them back", () => {
    const g = quietFight();
    park(g);
    const board = unit("BOARDER", { id: "landed", room: "p-weapons", hp: 150 });
    mount(g, [board]);
    const mate = g.crew.find((c) => c.side === "player" && c.room === "p-pilot");
    assert.ok(mate);
    const others = g.crew.filter((c) => c.side === "player" && c !== mate);
    assert.ok(others[0]);
    others[0].room = "p-weapons";
    others[0].path = [];
    const hp = others[0].hp;
    destroy(g);
    g.paused = false;
    g.phase = "map";
    ticks(g, 2);
    assert.ok(board.hp != null && board.hp < 150);
    assert.equal(others[0].hp, hp);
    assert.equal(board.powered, false);
    assert.equal(mate.room, "p-pilot");
  });

  it("leaves the room once your crew destroy it", () => {
    const g = quietFight();
    park(g);
    const board = unit("BOARDER", { id: "landed", room: "p-weapons", hp: 1 });
    mount(g, [board]);
    const mate = g.crew.find((c) => c.side === "player");
    assert.ok(mate);
    mate.room = "p-weapons";
    mate.path = [];
    destroy(g);
    g.paused = false;
    g.phase = "map";
    ticks(g, 2);
    assert.equal(board.alive, false);
    assert.equal(g.boarded, undefined);
    assert.equal(
      roomDroneHp(g.player, g).some((mark) => mark.room === "p-weapons"),
      false,
    );
  });

  it("still takes a weapon hit and a stun bomb after the ship is gone", () => {
    const g = quietFight();
    park(g);
    const board = unit("BOARDER", { id: "landed", room: "p-weapons", hp: 40 });
    mount(g, [board]);
    destroy(g);
    hurtRoomDrones(g, "player", "p-weapons", 10);
    assert.equal(board.hp, 35);
    applyImpact(g, stunBomb("p-weapons"));
    assert.ok((board.stun ?? 0) >= 15);
    assert.equal(board.powered, false);
    assert.equal(board.room, "p-weapons");
  });

  it("stays through the next fight and is removed when you jump", () => {
    const g = quietFight();
    park(g);
    const board = unit("BOARDER", { id: "landed", room: "p-weapons" });
    mount(g, [board]);
    destroy(g);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
    g.enemy.boards = false;
    g.boardTimer = 0;
    g.enemyEscape = null;
    g.enemySurrender = null;
    assert.equal(g.boarded?.[0], board);
    assert.equal(board.powered, false);
    board.fix = 12.4;
    const damage = g.player.systems.weapons.damage;
    ticks(g, 1);
    assert.equal(g.player.systems.weapons.damage, damage);
    assert.equal(board.room, "p-weapons");
    assert.equal(g.enemy == null, false);
    commitJump(g, quietDest(g));
    assert.equal(g.boarded, undefined);
    assert.equal(
      roomDroneHp(g.player, g).some((mark) => mark.room === "p-weapons"),
      false,
    );
  });

  it("is removed by the crystal jump too", () => {
    const g = quietFight();
    park(g);
    const board = unit("BOARDER", { id: "landed", room: "p-sensors" });
    mount(g, [board]);
    destroy(g);
    assert.equal(g.boarded?.[0], board);
    enterHiddenCrystal(g);
    assert.equal(g.boarded, undefined);
  });

  it("does not silence them when the crew die, the ship surrenders, or it flees", () => {
    const killed = quietFight(8, "pirate");
    park(killed);
    const stayed = unit("BOARDER", { id: "stayed", room: "p-weapons" });
    mount(killed, [stayed]);
    assert.equal(killed.enemy!.automated, false);
    assert.ok(killed.enemy!.classId);
    if (killed.enemy!.kits.clonebay) killed.enemy!.kits.clonebay.level = 0;
    for (const c of killed.crew) if (c.side === "enemy") c.hp = 0;
    const hull = killed.enemy!.hull;
    step(killed, 0.05);
    assert.ok(hull > 0);
    assert.ok(killed.wreck);
    assert.equal(killed.enemy, null);
    assert.equal(killed.boarded, undefined);
    assert.equal(killed.wreck.kits.drones?.drones?.includes(stayed), true);

    const surrendered = quietFight(9);
    const offered = unit("BOARDER", { id: "offered", room: "p-doors" });
    mount(surrendered, [offered]);
    closeFight(surrendered);
    assert.ok(surrendered.wreck);
    assert.equal(surrendered.boarded, undefined);
    assert.equal(surrendered.wreck.kits.drones?.drones?.includes(offered), true);

    const fled = quietFight(10);
    const runner = unit("BOARDER", { id: "runner", room: "p-oxygen" });
    mount(fled, [runner]);
    fled.enemyFlee = 1;
    step(fled, 0.05);
    assert.equal(fled.enemy, null);
    assert.equal(fled.wreck ?? null, null);
    assert.equal(fled.boarded, undefined);
  });
});

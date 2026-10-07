import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, createGame, evasionPercent, sparePower, startCombat } from "../sim.ts";
import type { Game, Shot } from "../types.ts";
import {
  INSTALL_COST,
  installLeash,
  leashedDamageBonus,
  startLeash,
  tickLeash,
  toggleLeashPower,
  upgradeLeash,
} from "./leash.ts";
import type { Kit } from "../types.ts";

function pushKit(g: ReturnType<typeof createGame>, level = 1, power = 1): Kit {
  const kit: Kit = {
    id: "leash",
    level,
    power,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
  g.player.kits.leash = kit;
  return kit;
}

function enemyPilot(g: ReturnType<typeof createGame>) {
  // Enemy crew are named by race (enemy-gen.ts); the pilot is whoever sits in the piloting room.
  return g.crew.find((c) => c.side === "enemy" && c.aboard === "enemy" && c.room === "e-pilot");
}

/** Sensors level 2 shows enemy crew. Mind Control, Overview: that view is required. */
function see(g: ReturnType<typeof createGame>) {
  g.player.systems.sensors.level = 2;
}

describe("leash", () => {
  it("leashes the enemy pilot for the level duration, then clears it", () => {
    const g = createGame(1);
    startCombat(g, "Rebel ship");
    const kit = pushKit(g, 1, 1);
    see(g);
    const pilot = enemyPilot(g);
    assert.ok(pilot);
    const before = pilot.room;
    startLeash(g, pilot.id);
    assert.equal(pilot.side, "enemy");
    assert.equal(pilot.leashed, 14);
    assert.ok((pilot.leashed ?? 0) > 0);
    assert.equal(kit.on, true);
    assert.equal(kit.left, 14);
    assert.equal(leashedDamageBonus(pilot), 1);
    const ally = g.crew.find(
      (c) =>
        c.id !== pilot.id &&
        c.side === "enemy" &&
        c.aboard === "enemy" &&
        c.hp > 0 &&
        !(c.leashed && c.leashed > 0),
    );
    assert.ok(ally);
    assert.notEqual(before, ally.room);
    assert.equal(pilot.room, ally.room);
    tickLeash(g, 14);
    assert.equal(pilot.leashed, undefined);
    assert.equal(kit.on, false);
    assert.equal(kit.left, 0);
    assert.equal(kit.cool, 0);
    assert.equal(leashedDamageBonus(pilot), 1);
  });

  it("scales duration and damage with the upgrade table", () => {
    const mid = createGame(2);
    startCombat(mid, "Rebel ship");
    pushKit(mid, 2, 1);
    see(mid);
    const gunner = mid.crew.find((c) => c.side === "enemy" && c.aboard === "enemy" && c.room === "e-weapons");
    assert.ok(gunner);
    startLeash(mid, gunner.id);
    assert.equal(gunner.leashed, 20);
    assert.equal(leashedDamageBonus(gunner), 1.25);
    assert.equal(gunner.side, "enemy");

    const high = createGame(3);
    startCombat(high, "Rebel ship");
    pushKit(high, 3, 1);
    see(high);
    const pilot = enemyPilot(high);
    assert.ok(pilot);
    startLeash(high, pilot.id);
    assert.equal(pilot.leashed, 28);
    assert.equal(leashedDamageBonus(pilot), 2);
    tickLeash(high, 10);
    assert.ok((pilot.leashed ?? 0) > 0);
    tickLeash(high, 18);
    assert.equal(pilot.leashed, undefined);
  });

  it("spends the sheet price and one spare bar", () => {
    const g = createGame(4);
    assert.equal(INSTALL_COST, 75);
    g.scrap = 75;
    installLeash(g);
    assert.equal(g.scrap, 0);
    const kit = g.player.kits.leash;
    assert.ok(kit);
    assert.equal(kit.level, 1);
    assert.equal(kit.power, 0);
    const free = sparePower(g.player);
    assert.ok(free >= 1);
    toggleLeashPower(g);
    assert.equal(kit.power, 1);
    assert.equal(sparePower(g.player), free - 1);
    g.scrap = 30;
    upgradeLeash(g);
    assert.equal(kit.level, 2);
    assert.equal(g.scrap, 0);
    g.scrap = 60;
    upgradeLeash(g);
    assert.equal(kit.level, 3);
    assert.equal(g.scrap, 0);
  });

  it("does not leash without power", () => {
    const g = createGame(5);
    startCombat(g, "Rebel ship");
    pushKit(g, 1, 0);
    const pilot = enemyPilot(g);
    assert.ok(pilot);
    startLeash(g, pilot.id);
    assert.equal(pilot.leashed, undefined);
    assert.equal(pilot.side, "enemy");
  });

  it("does not leash an enemy crew member you cannot see, and does not spend the kit", () => {
    const g = createGame(11);
    startCombat(g, "Rebel ship");
    const kit = pushKit(g, 1, 1);
    g.player.systems.sensors.level = 0;
    g.player.systems.sensors.power = 0;
    const pilot = enemyPilot(g);
    assert.ok(pilot);
    startLeash(g, pilot.id);
    assert.equal(pilot.leashed, undefined);
    assert.equal(kit.on, false);
    assert.equal(kit.left, 0);
    assert.equal(kit.cool, 0);
  });

  it("a living Slug is enough view to leash when sensors are off", () => {
    const g = createGame(12);
    startCombat(g, "Rebel ship");
    pushKit(g, 1, 1);
    g.player.systems.sensors.level = 0;
    const slug = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(slug);
    slug.kin = "gel";
    const pilot = enemyPilot(g);
    assert.ok(pilot);
    startLeash(g, pilot.id);
    assert.equal(pilot.leashed, 14);
  });

  it("manning level-1 Sensors is enough view", () => {
    const g = createGame(13);
    startCombat(g, "Rebel ship");
    pushKit(g, 1, 1);
    g.player.systems.sensors.level = 1;
    g.player.systems.sensors.power = 1;
    const room = g.player.rooms.find((r) => r.system === "sensors");
    const body = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(room && body);
    body.room = room.id;
    body.path = [];
    body.aboard = "player";
    const pilot = enemyPilot(g);
    assert.ok(pilot);
    startLeash(g, pilot.id);
    assert.equal(pilot.leashed, 14);
  });

  // Mind Control, Overview: "teleporting a bomb that doesn't miss a targeted room".
  // INFERRED: only that room, only a player bomb, and it stays open through a later cloak until the next fight.
  it("opens the targeted room when a player bomb does not miss", () => {
    const g = createGame(21);
    startCombat(g, "Rebel ship");
    const kit = pushKit(g, 1, 1);
    g.player.systems.sensors.level = 0;
    g.player.systems.sensors.power = 0;
    assert.ok(g.enemy);
    g.enemy.systems.engines.level = 0;
    g.enemy.systems.engines.power = 0;
    assert.equal(evasionPercent(g, g.enemy, "enemy"), 0);
    const pilot = enemyPilot(g);
    assert.ok(pilot);
    const other = g.crew.find((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0 && c.room !== pilot.room);
    assert.ok(other);
    applyImpact(g, roomBomb(other.room));
    startLeash(g, pilot.id);
    assert.equal(pilot.leashed, undefined);
    assert.equal(kit.on, false);
    applyImpact(g, roomBomb(pilot.room, "enemy"));
    startLeash(g, pilot.id);
    assert.equal(pilot.leashed, undefined);
    applyImpact(g, roomBomb(pilot.room));
    g.enemy.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    startLeash(g, pilot.id);
    assert.equal(pilot.leashed, 14);
    kit.on = false;
    kit.left = 0;
    kit.target = null;
    startCombat(g, "Rebel ship");
    g.player.systems.sensors.level = 0;
    g.player.systems.sensors.power = 0;
    const again = enemyPilot(g);
    assert.ok(again);
    startLeash(g, again.id);
    assert.equal(again.leashed, undefined);
    g.player.systems.sensors.level = 2;
    g.player.systems.sensors.power = 2;
    startLeash(g, again.id);
    assert.equal(again.leashed, 14);
  });

  it("does not open a room when the bomb misses", () => {
    const g = createGame(22);
    startCombat(g, "Rebel ship");
    const kit = pushKit(g, 1, 1);
    g.player.systems.sensors.level = 0;
    g.player.systems.sensors.power = 0;
    assert.ok(g.enemy);
    forceEnemyEvade(g);
    assert.equal(evasionPercent(g, g.enemy, "enemy"), 100);
    const crew = g.crew.find((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0 && c.kin !== "gel");
    assert.ok(crew);
    applyImpact(g, roomBomb(crew.room));
    startLeash(g, crew.id);
    assert.equal(crew.leashed, undefined);
    assert.equal(kit.on, false);
    assert.equal(kit.left, 0);
  });
});

function roomBomb(targetRoom: string, from: "player" | "enemy" = "player"): Shot {
  return {
    id: "s",
    kind: "bomb",
    from,
    at: from === "enemy" ? "enemy" : undefined,
    damage: 0,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    wait: 0,
    t: 1,
    duration: 1,
    targetRoom,
    defId: "healburst",
  };
}

function forceEnemyEvade(g: Game) {
  const hull = g.enemy!;
  hull.systems.engines.level = 8;
  hull.systems.engines.power = 8;
  hull.systems.engines.damage = 0;
  hull.systems.pilot.level = Math.max(1, hull.systems.pilot.level);
  hull.systems.pilot.damage = 0;
  hull.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
  const engines = hull.rooms.find((r) => r.system === "engines");
  const pilot = hull.rooms.find((r) => r.system === "pilot");
  const crew = g.crew.filter((c) => c.aboard === "enemy" && c.hp > 0);
  if (engines && crew[0]) {
    crew[0].room = engines.id;
    crew[0].path = [];
  }
  if (pilot && crew[1]) {
    crew[1].room = pilot.id;
    crew[1].path = [];
  }
}

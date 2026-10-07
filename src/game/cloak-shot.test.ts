import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEAPONS } from "./content.ts";
import { chargerCap, createGame, powerMask, startCombat, step } from "./sim.ts";
import type { Game, WeaponInst } from "./types.ts";

function cloakedFight(): Game {
  const g = createGame(1);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.paused = false;
  for (const gun of g.enemy.weapons) {
    gun.enabled = false;
    gun.target = null;
  }
  g.enemy.kits.veil = {
    id: "veil",
    level: 1,
    power: 1,
    left: 10,
    cool: 0,
    target: "fire",
    on: true,
    aux: 0,
  };
  return g;
}

function assertNoPresence(g: Game) {
  assert.equal(
    g.crew.some((c) => c.hp > 0 && c.side === "player" && c.aboard === "enemy"),
    false,
  );
  assert.equal(
    g.crew.some((c) => c.hp > 0 && c.side === "enemy" && c.aboard === "enemy" && (c.leashed ?? 0) > 0),
    false,
  );
  const swarm = g.player.kits.swarm;
  assert.ok(!swarm || (swarm.target !== "board" && swarm.target !== "ionintruder"));
}

/** Power Weapon Control for the first slot without touching the cloak. */
function primeLaser(g: Game, charge: number): WeaponInst {
  const w = g.player.weapons[0];
  assert.ok(w);
  const def = WEAPONS[w.defId];
  assert.equal(def?.kind, "laser");
  assert.equal(chargerCap(w.defId), null);
  const cost = def?.power ?? 1;
  const sys = g.player.systems.weapons;
  sys.damage = 0;
  sys.ion = [];
  if (sys.level < cost) sys.level = cost;
  if (sys.power < cost) sys.power = cost;
  w.enabled = true;
  w.charge = charge;
  w.target = g.enemy!.rooms[0]!.id;
  assert.equal(powerMask(g.player)[0], true);
  return w;
}

function playerShots(g: Game): number {
  return g.shots.filter((s) => s.from === "player").length;
}

describe("cloaked enemy, charged player shot", () => {
  it("does not fire a charged laser and leaves the charge frozen", () => {
    const g = cloakedFight();
    assertNoPresence(g);
    const w = primeLaser(g, 1);
    const before = playerShots(g);
    step(g, 0.05);
    assert.equal(playerShots(g), before);
    assert.equal(w.charge, 1);
  });

  it("fires when a living player crew member is aboard the enemy", () => {
    const g = cloakedFight();
    const w = primeLaser(g, 1);
    const crew = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(crew);
    crew.aboard = "enemy";
    crew.room = g.enemy!.rooms[0]!.id;
    crew.path = [];
    step(g, 0.05);
    assert.ok(playerShots(g) > 0);
    assert.notEqual(w.charge, 1);
  });

  it("fires when a mind-controlled enemy crew member is still aboard", () => {
    const g = cloakedFight();
    const w = primeLaser(g, 1);
    assert.equal(
      g.crew.some((c) => c.hp > 0 && c.side === "player" && c.aboard === "enemy"),
      false,
    );
    const foe = g.crew.find((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0);
    assert.ok(foe);
    foe.leashed = 8;
    step(g, 0.05);
    assert.ok(playerShots(g) > 0);
    assert.notEqual(w.charge, 1);
  });

  it("fires when an ion intruder has boarded", () => {
    const g = cloakedFight();
    const w = primeLaser(g, 1);
    assert.equal(
      g.crew.some((c) => c.hp > 0 && c.side === "player" && c.aboard === "enemy"),
      false,
    );
    assert.equal(
      g.crew.some((c) => c.hp > 0 && c.side === "enemy" && (c.leashed ?? 0) > 0),
      false,
    );
    g.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 0,
      left: 0,
      cool: 0,
      target: "ionintruder",
      on: true,
      aux: 0,
      room: g.enemy!.rooms[0]!.id,
      hp: 125,
    };
    step(g, 0.05);
    assert.ok(playerShots(g) > 0);
    assert.notEqual(w.charge, 1);
  });

  it("does not advance a partial charge while the enemy cloak is up", () => {
    const g = cloakedFight();
    assertNoPresence(g);
    const w = primeLaser(g, 0.4);
    step(g, 0.05);
    assert.equal(playerShots(g), 0);
    assert.equal(w.charge, 0.4);
  });
});

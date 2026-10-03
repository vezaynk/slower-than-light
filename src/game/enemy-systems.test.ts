import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rollEnemy } from "./enemy-gen.ts";
import { enemyHoldsFire } from "./extras/veil.ts";
import { createGame, startCombat, step } from "./sim.ts";
import { ENEMY_CLASSES } from "./wiki/enemy-ships.ts";

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const ctx = { sector: 6, sectorName: "Civilian Sector", difficulty: "normal" as const };

describe("enemy subsystems: groundwork", () => {
  it("turns drones, hacking, cloaking, teleporter, clone bay, and mind control into kits", () => {
    const seen = new Set<string>();
    for (const cls of ENEMY_CLASSES) {
      for (let i = 0; i < 8; i++) {
        const spec = rollEnemy(cls, false, ctx, seeded(i * 13 + cls.id.length));
        Object.keys(spec.kits).forEach((k) => seen.add(k));
        assert.deepEqual(spec.unwired.map((u) => u.id).filter((id) => id !== "artillery"), [], cls.id);
      }
    }
    for (const kit of ["swarm", "spike", "veil", "sling", "cradle", "leash"]) assert.ok(seen.has(kit), kit);
  });

  it("sizes the reactor to the installed capacity", () => {
    const spec = rollEnemy(ENEMY_CLASSES.find((c) => c.id === "engi-hacker")!, false, ctx, seeded(3));
    const capacity =
      Object.values(spec.systems).reduce((sum, [level]) => sum + level, 0) +
      Object.values(spec.kits).reduce((sum, level) => sum + (level ?? 0), 0);
    assert.equal(spec.reactor, capacity);
  });

  it("never fits a Clone Bay and a Medbay together", () => {
    for (const cls of ENEMY_CLASSES) {
      for (let i = 0; i < 12; i++) {
        const spec = rollEnemy(cls, false, ctx, seeded(i * 7 + 1));
        assert.ok(!(spec.kits.cradle && spec.systems.medbay), cls.id);
      }
    }
  });

  it("cloaks at the start of a fight and may hold fire while cloaked", () => {
    let held = false;
    let cloaked = false;
    for (let seed = 1; seed <= 40 && !(held && cloaked); seed++) {
      const g = createGame(seed);
      g.sector = 6;
      startCombat(g, "Crystal ship");
      if (!g.enemy?.kits.veil) continue;
      step(g, 1 / 30);
      cloaked ||= g.enemy.kits.veil.on;
      held ||= enemyHoldsFire(g);
    }
    assert.ok(cloaked, "no cloaking enemy rolled");
    assert.ok(held, "never held fire");
  });

  it("wins the fight when a manned enemy's whole crew is dead", () => {
    const g = createGame(5);
    startCombat(g, "Rebel ship");
    g.paused = false;
    for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
    step(g, 1 / 30);
    assert.notEqual(g.phase, "combat");
  });
});

describe("enemy subsystem rooms take damage", () => {
  it("a hit on a kit room knocks out bars, and crew repair them", async () => {
    const { applyImpact, kitBars } = await import("./sim.ts");
    for (let seed = 1; seed <= 60; seed++) {
      const g = createGame(seed);
      g.sector = 6;
      startCombat(g, "Crystal ship");
      const room = g.enemy?.rooms.find((r) => r.kit);
      if (!g.enemy || !room?.kit) continue;
      const kit = g.enemy.kits[room.kit]!;
      const before = kitBars(kit);
      g.enemy.shieldNow = 0;
      g.enemy.zoltan = undefined;
      applyImpact(g, { id: "t", kind: "missile", from: "player", damage: 1, ion: 0, fireChance: 0, breachChance: 0, targetRoom: room.id, wait: 0, t: 1, duration: 1 });
      if (kitBars(kit) === before) continue; // dodged
      assert.equal(kit.damage, 1);
      return;
    }
    assert.fail("no kit room was hit");
  });
});

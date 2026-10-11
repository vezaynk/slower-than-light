import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { XP_NEED, skillRank } from "../content.ts";
import { createGame, startCombat, step } from "../sim.ts";
import { BREACH_C } from "../air.ts";
import { HUMAN_XP_NEED, LANIUS_HOLE_C, isHuman, xpNeedFor } from "./lineage.ts";
import type { Crew, Game } from "../types.ts";

function combat(): Game {
  const g = createGame(1);
  startCombat(g, "Rebel ship");
  return g;
}

function crewOn(g: Game, aboard: "player" | "enemy"): Crew {
  const c = g.crew.find((x) => x.aboard === aboard && x.hp > 0);
  assert.ok(c);
  return c;
}

function roomOf(g: Game, c: Crew) {
  const ship = c.aboard === "player" ? g.player : g.enemy;
  const r = ship?.rooms.find((x) => x.id === c.room);
  assert.ok(r);
  return r;
}

/** One combat step with the Oxygen system off and every door shut: only breathing, holes, and seepage move air. */
function settle(g: Game, seconds: number) {
  g.player.systems.oxygen.power = 0;
  if (g.enemy) g.enemy.systems.oxygen.power = 0;
  for (const d of [...g.player.doors, ...(g.enemy?.doors ?? [])]) d.open = false;
  for (const w of [...g.player.weapons, ...(g.enemy?.weapons ?? [])]) w.enabled = false;
  if (g.enemy) g.enemy.weapons = [];
  for (let t = 0; t < seconds; t += 0.05) step(g, 0.05);
}

describe("Lanius oxygen drain (a breach-sized hole, air.ts)", () => {
  it("drains its room like one breach, and does more than a breathing crew member", () => {
    assert.equal(LANIUS_HOLE_C, BREACH_C);
    const run = (kin: "voidlung" | "plain") => {
      const g = combat();
      for (const c of g.crew) c.kin = "plain";
      const lan = crewOn(g, "player");
      lan.kin = kin;
      const r = roomOf(g, lan);
      for (const c of g.crew) if (c !== lan && c.room === r.id) c.room = g.player.rooms.find((x) => x.id !== r.id)!.id;
      r.o2 = 100;
      settle(g, 1);
      return r.o2;
    };
    assert.ok(run("voidlung") < run("plain"));
  });

  it("stacks per Lanius in the same room", () => {
    const run = (n: 1 | 2) => {
      const g = combat();
      for (const c of g.crew) c.kin = "plain";
      const a = crewOn(g, "player");
      const b = g.crew.find((x) => x !== a && x.aboard === "player" && x.hp > 0);
      assert.ok(b);
      b.room = a.room;
      a.kin = "voidlung";
      b.kin = n === 2 ? "voidlung" : "plain";
      const r = roomOf(g, a);
      r.o2 = 100;
      settle(g, 1);
      return r.o2;
    };
    assert.ok(run(2) < run(1));
  });

  it("drains the enemy ship when a Lanius boards it, and never goes below 0", () => {
    const run = (kin: "voidlung" | "plain") => {
      const g = combat();
      for (const c of g.crew) c.kin = "plain";
      const lan = crewOn(g, "player");
      lan.kin = kin;
      lan.aboard = "enemy";
      lan.path = [];
      const target = g.enemy?.rooms[0];
      assert.ok(target);
      lan.room = target.id;
      target.o2 = 5;
      settle(g, 3);
      return target.o2;
    };
    const drained = run("voidlung");
    assert.ok(drained < run("plain"), `${drained}`);
    assert.ok(drained >= 0);
  });

  it("dead Lanius do not drain", () => {
    const g = combat();
    for (const c of g.crew) c.kin = "plain";
    const lan = crewOn(g, "player");
    lan.kin = "voidlung";
    lan.hp = 0;
    const r = roomOf(g, lan);
    for (const c of g.crew) if (c !== lan && c.room === r.id) c.room = g.player.rooms.find((x) => x.id !== r.id)!.id;
    for (const x of g.player.rooms) x.o2 = 80;
    settle(g, 1);
    assert.ok(Math.abs(r.o2 - 80) < 0.01, `${r.o2}`);
  });
});

describe("Human experience requirements", () => {
  it("uses the printed Human XP/level column, about 0.9x the base", () => {
    for (const k of Object.keys(XP_NEED) as (keyof typeof XP_NEED)[]) {
      assert.ok(Math.abs(HUMAN_XP_NEED[k] - XP_NEED[k] * 0.9) <= 0.5, k);
    }
    assert.deepEqual(HUMAN_XP_NEED, { pilot: 13, engines: 13, shields: 50, weapons: 58, repair: 16, combat: 7 });
  });

  it("humans (plain or no kin) rank up sooner; others use the base table", () => {
    const human = { kin: "plain" } as Crew;
    const baseline = {} as Crew;
    const engi = { kin: "shell" } as Crew;
    assert.ok(isHuman(human) && isHuman(baseline) && !isHuman(engi));
    assert.equal(skillRank(13, xpNeedFor(human, "pilot")), 1);
    assert.equal(skillRank(13, xpNeedFor(engi, "pilot")), 0);
    assert.equal(skillRank(26, xpNeedFor(baseline, "pilot")), 2);
    assert.equal(xpNeedFor(engi, "weapons"), 65);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { XP_NEED, skillRank } from "../content.ts";
import { createGame, startCombat } from "../sim.ts";
import { BREACH_O2_PER_SEC, HUMAN_XP_NEED, LANIUS_DRAIN_PER_SEC, isHuman, tickLanius, xpNeedFor } from "./lineage.ts";
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

describe("Lanius oxygen drain", () => {
  it("drains its room at one breach's rate per second", () => {
    const g = combat();
    for (const c of g.crew) c.kin = "plain";
    const lan = crewOn(g, "player");
    lan.kin = "voidlung";
    const r = roomOf(g, lan);
    r.o2 = 100;
    tickLanius(g, 0.5);
    assert.equal(r.o2, 100 - LANIUS_DRAIN_PER_SEC * 0.5);
    // Oxygen-2 is 4.8%/s and does not beat one breach alone. Oxygen-3 is 8.4%/s and does.
    assert.ok(BREACH_O2_PER_SEC > 4.8 && BREACH_O2_PER_SEC < 8.4);
    assert.equal(LANIUS_DRAIN_PER_SEC, BREACH_O2_PER_SEC);
  });

  it("stacks per Lanius in the same room", () => {
    const g = combat();
    for (const c of g.crew) c.kin = "plain";
    const a = crewOn(g, "player");
    const b = g.crew.find((x) => x !== a && x.aboard === "player" && x.hp > 0);
    assert.ok(b);
    b.room = a.room;
    a.kin = "voidlung";
    b.kin = "voidlung";
    const r = roomOf(g, a);
    r.o2 = 100;
    tickLanius(g, 1);
    assert.equal(r.o2, 100 - 2 * LANIUS_DRAIN_PER_SEC);
  });

  it("drains the enemy ship when a Lanius boards it, and clamps at 0", () => {
    const g = combat();
    for (const c of g.crew) c.kin = "plain";
    const lan = crewOn(g, "player");
    lan.kin = "voidlung";
    lan.aboard = "enemy";
    lan.path = [];
    const target = g.enemy?.rooms[0];
    assert.ok(target);
    lan.room = target.id;
    target.o2 = 5;
    tickLanius(g, 1);
    assert.equal(target.o2, 0);
  });

  it("dead Lanius do not drain", () => {
    const g = combat();
    for (const c of g.crew) c.kin = "plain";
    const lan = crewOn(g, "player");
    lan.kin = "voidlung";
    lan.hp = 0;
    const r = roomOf(g, lan);
    r.o2 = 80;
    tickLanius(g, 1);
    assert.equal(r.o2, 80);
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

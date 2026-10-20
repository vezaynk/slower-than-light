import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chooseSector, commitJump, continueReward, createGame, startCombat, step } from "./sim.ts";
import type { Beacon, Game } from "./types.ts";

function lastStand(seed: number): Game {
  const g = createGame(seed, "PLAYER_SHIP_HARD");
  const from = g.route.find((n) => n.links.includes("sec-7"));
  assert.ok(from);
  g.sector = 7;
  g.phase = "map";
  g.sectorMap = true;
  g.routeHere = from.id;
  g.fuel = 30;
  g.player.hull = 20;
  chooseSector(g, "sec-7");
  return g;
}

function span(a: Beacon, b: Beacon): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function jumpAside(g: Game) {
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here);
  const dest = g.beacons.find((b) => here.links.includes(b.id) && b.id !== g.ramId);
  assert.ok(dest);
  g.phase = "map";
  g.fuel = 5;
  g.paused = false;
  g.enemy = null;
  g.ramClock = 1;
  commitJump(g, dest.id);
}

describe("Flagship path", () => {
  it("seats the Federation base in column 3 and the Flagship to its right", () => {
    const g = lastStand(4);
    const base = g.beacons.find((b) => b.flag === "fed-base");
    const ram = g.beacons.find((b) => b.id === g.ramId);
    assert.ok(base);
    assert.ok(ram);
    assert.equal(base.name, "Federation Base");
    assert.equal(base.kind, "empty");
    assert.equal(base.col, 3);
    assert.ok(ram.col > base.col);
    assert.equal(ram.name, "Flagship");
    assert.equal(g.beacons.filter((b) => b.flag === "BOSS_REPAIR_STATION").length, 3);
  });

  it("jumps to a beacon closer to the base", () => {
    const g = lastStand(3);
    const base = g.beacons.find((b) => b.flag === "fed-base");
    const before = g.beacons.find((b) => b.id === g.ramId);
    assert.ok(base);
    assert.ok(before);
    const beforeSpan = span(before, base);
    jumpAside(g);
    const after = g.beacons.find((b) => b.id === g.ramId);
    assert.ok(after);
    assert.ok(span(after, base) < beforeSpan);
    assert.equal(g.outcome, "");
  });

  it("ends the run on the third jump spent on the base", () => {
    const g = lastStand(2);
    const base = g.beacons.find((b) => b.flag === "fed-base");
    const ram = g.beacons.find((b) => b.id === g.ramId);
    assert.ok(base);
    assert.ok(ram);
    ram.kind = "empty";
    ram.name = "Wake";
    ram.tier = "";
    base.kind = "boss";
    base.name = "Flagship";
    base.tier = "boss";
    g.ramId = base.id;
    g.ramAtBase = 0;
    jumpAside(g);
    assert.equal(g.ramId, base.id);
    assert.notEqual(g.phase, "defeat");
    jumpAside(g);
    assert.equal(g.ramId, base.id);
    assert.notEqual(g.phase, "defeat");
    jumpAside(g);
    assert.equal(g.phase, "defeat");
    assert.equal(g.outcome, "rebel");
  });

  it("ends the battle when a stage falls and moves the Flagship one beacon closer", () => {
    const g = lastStand(3);
    const base = g.beacons.find((b) => b.flag === "fed-base");
    const before = g.beacons.find((b) => b.id === g.ramId);
    assert.ok(base);
    assert.ok(before);
    const beforeSpan = span(before, base);
    g.here = before.id;
    startCombat(g, "boss", false);
    assert.equal(g.ramStage, 1);
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.01);
    assert.equal(g.phase, "reward");
    assert.equal(g.enemy, null);
    assert.equal(g.kills, 0);
    assert.equal(g.flagshipMemo?.stage, 2);
    assert.equal(g.ramAtBase ?? 0, 0);
    const after = g.beacons.find((b) => b.id === g.ramId);
    assert.ok(after);
    assert.ok(span(after, base) < beforeSpan);
    assert.equal(before.kind, "empty");
    assert.equal(before.name, "Beacon");
    continueReward(g);
    assert.equal(g.phase, "map");
    assert.equal(g.enemy, null);
    assert.equal(g.flagshipMemo?.stage, 2);
  });

  it("opens the next stage after the card when the Flagship already holds the base", () => {
    const g = lastStand(2);
    const base = g.beacons.find((b) => b.flag === "fed-base");
    const ram = g.beacons.find((b) => b.id === g.ramId);
    assert.ok(base);
    assert.ok(ram);
    ram.kind = "empty";
    ram.name = "Beacon";
    ram.tier = "";
    base.kind = "boss";
    base.name = "Flagship";
    base.tier = "boss";
    g.ramId = base.id;
    g.ramAtBase = 2;
    g.here = base.id;
    startCombat(g, "boss", false);
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.01);
    assert.equal(g.phase, "reward");
    assert.equal(g.ramAtBase, 2);
    assert.equal(g.ramId, base.id);
    assert.notEqual(g.outcome, "rebel");
    continueReward(g);
    assert.equal(g.phase, "combat");
    assert.equal(g.ramStage, 2);
    assert.equal(g.enemy?.hull, 22);
    assert.equal(g.ramAtBase, 2);
  });
});

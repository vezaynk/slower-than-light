import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chooseSector, commitJump, createGame } from "./sim.ts";
import type { Beacon, Game } from "./types.ts";

function lastStand(seed: number): Game {
  const g = createGame(seed, "kestrel-a");
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
    assert.equal(g.beacons.filter((b) => b.flag === "last-stand-repair").length, 3);
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
});

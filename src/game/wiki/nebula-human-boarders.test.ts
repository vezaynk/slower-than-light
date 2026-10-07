import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-humans-in-nebula:0";
const DEST = "Boarders: Humans in nebula";
const SECTORS = ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: DEST,
    tier: "",
    flag: "cited:boarders-humans-in-nebula",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "plain" && c.aboard === "player");
}

describe("Boarders: Humans in nebula", () => {
  it("is one card in each named sector and beams 2-4 humans with no ship", () => {
    for (const sector of SECTORS) {
      const pages = citedPagesFor(sector).filter((e) => e.dest === DEST);
      assert.equal(pages.length, 1, sector);
      assert.deepEqual([...pages[0].sectors], SECTORS);
    }
    const ev = citedEvent(createGame(1), beacon());
    assert.ok(ev);
    assert.ok(ev.body.length <= 240);
    assert.equal(ev.choices.length, 1);
    assert.equal(ev.choices[0]?.id, ID);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 80 && !(seen.has(2) && seen.has(4)); seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const kills = g.kills;
      const before = g.crew.length;
      choose(g, ID);
      const humans = boarded(g);
      assert.ok(humans.length >= 2 && humans.length <= 4, String(humans.length));
      seen.add(humans.length);
      assert.equal(g.crew.length, before + humans.length);
      assert.equal(g.enemy, null);
      assert.equal(g.phase, "combat");
      assert.equal(g.flare, false);
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
    }
    assert.ok(seen.has(2) && seen.has(4), [...seen].sort().join(","));
  });
});

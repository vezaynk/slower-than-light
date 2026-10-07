import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-crystal:0";
const DEST = "Boarders: Crystal";

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
    flag: "cited:boarders-crystal",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "shard" && c.aboard === "player");
}

describe("Boarders: Crystal", () => {
  it("is one Hidden Crystal Worlds card and beams 2-3 crystal boarders with no ship", () => {
    const pages = citedPagesFor("Hidden Crystal Worlds").filter((e) => e.dest === DEST);
    assert.equal(pages.length, 1);
    assert.deepEqual([...pages[0].sectors], ["Hidden Crystal Worlds"]);
    const ev = citedEvent(createGame(1), beacon());
    assert.ok(ev);
    assert.ok(ev.body.length <= 240);
    assert.equal(ev.choices.length, 1);
    assert.equal(ev.choices[0]?.id, ID);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 80 && !(seen.has(2) && seen.has(3)); seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const kills = g.kills;
      const before = g.crew.length;
      choose(g, ID);
      const crystals = boarded(g);
      assert.ok(crystals.length >= 2 && crystals.length <= 3, String(crystals.length));
      seen.add(crystals.length);
      assert.equal(g.crew.length, before + crystals.length);
      assert.ok(crystals.every((c) => c.name === "Crystal"));
      assert.equal(g.enemy, null);
      assert.equal(g.phase, "combat");
      assert.equal(g.flare, false);
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
    }
    assert.ok(seen.has(2) && seen.has(3), [...seen].sort().join(","));
  });
});

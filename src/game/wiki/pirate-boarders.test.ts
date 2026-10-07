import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lungScale } from "../extras/augments.ts";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-humans-pirate:0";
const DEST = "Boarders: Humans (Pirate)";

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
    flag: "cited:boarders-humans-pirate",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "plain" && c.aboard === "player");
}

describe("Boarders: Humans (Pirate)", () => {
  it("is one Pirate Controlled Sector card and beams 3-5 humans with no ship", () => {
    const pages = citedPagesFor("Pirate Controlled Sector").filter((e) => e.dest === DEST);
    assert.equal(pages.length, 1);
    assert.deepEqual([...pages[0].sectors], ["Pirate Controlled Sector"]);
    assert.ok(pages[0].body.length <= 240);
    const ev = citedEvent(createGame(1), beacon());
    assert.ok(ev);
    assert.equal(ev.choices.length, 1);
    assert.equal(ev.choices[0].id, ID);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 80 && !(seen.has(3) && seen.has(5)); seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const kills = g.kills;
      const before = g.crew.length;
      choose(g, ID);
      const humans = boarded(g);
      assert.ok(humans.length >= 3 && humans.length <= 5, String(humans.length));
      seen.add(humans.length);
      assert.equal(g.crew.length, before + humans.length);
      assert.ok(humans.every((c) => c.lungs !== true));
      assert.ok(humans.every((c) => lungScale(g, c) === 1));
      assert.equal(g.enemy, null);
      assert.equal(g.phase, "combat");
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
      assert.equal(g.augments.includes("lung"), false);
    }
    assert.ok(seen.has(3) && seen.has(5), [...seen].sort().join(","));
  });
});

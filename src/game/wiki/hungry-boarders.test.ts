import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lungScale } from "../extras/augments.ts";
import { choose, createGame, startCombat } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-humans-abandoned:0";

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Boarders: Humans (Abandoned)",
    tier: "",
    flag: "cited:boarders-humans-abandoned",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "plain" && c.aboard === "player");
}

describe("Boarders: Humans (Abandoned)", () => {
  it("is one Abandoned Sector card and beams 3-4 humans with no ship", () => {
    const pages = citedPagesFor("Abandoned Sector").filter((e) => e.dest === "Boarders: Humans (Abandoned)");
    assert.equal(pages.length, 1);
    assert.deepEqual([...pages[0].sectors], ["Abandoned Sector"]);
    assert.ok(pages[0].body.length <= 240);
    const g = createGame(2);
    const ev = citedEvent(g, beacon());
    assert.ok(ev);
    assert.equal(ev.choices.length, 1);
    assert.equal(ev.choices[0].id, ID);
    const before = g.crew.length;
    choose(g, ID);
    const humans = boarded(g);
    assert.ok(humans.length >= 3 && humans.length <= 4, String(humans.length));
    assert.equal(g.crew.length, before + humans.length);
    assert.ok(humans.every((c) => c.lungs !== true));
    assert.ok(humans.every((c) => lungScale(g, c) === 1));
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.augments.includes("lung"), false);
  });

  it("gives Emergency Respirators after a Lanius fight, including a repeat before another fight", () => {
    const g = createGame(3);
    g.lastFaction = "lanius";
    choose(g, ID);
    const first = boarded(g);
    assert.ok(first.length >= 3 && first.length <= 4, String(first.length));
    assert.ok(first.every((c) => c.lungs === true));
    assert.ok(first.every((c) => lungScale(g, c) === 0.5));
    choose(g, ID);
    const again = boarded(g);
    assert.ok(again.length >= 6 && again.length <= 8, String(again.length));
    assert.ok(again.every((c) => c.lungs === true && lungScale(g, c) === 0.5));

    startCombat(g, "Rebel ship");
    assert.notEqual(g.lastFaction, "lanius");
    choose(g, ID);
    const later = boarded(g);
    assert.ok(later.length >= 3 && later.length <= 4, String(later.length));
    assert.ok(later.every((c) => c.lungs !== true));
    assert.ok(later.every((c) => lungScale(g, c) === 1));
    assert.equal(g.enemy, null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent } from "./filler-events.ts";

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Intelligent ponies",
    tier: "",
    flag: "filler:intelligent-ponies",
    asteroid: false,
  };
}

function open(g: Game) {
  const b = beacon();
  g.beacons = [b];
  g.here = "b";
  const ev = fillerEvent(g, b);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  return ev;
}

describe("Intelligent ponies", () => {
  it("ignoring the readings prints the sentence and nothing happens", () => {
    const g = createGame(1);
    const ev = open(g);
    assert.equal(ev.title, "Intelligent ponies");
    assert.ok(ev.choices.some((c) => c.id === "c:intelligent-ponies:1"));
    g.fleet = 5;
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    choose(g, "c:intelligent-ponies:1");
    assert.equal(g.event?.body, "You ignore the readings and prepare to move on.\n\nNothing happens.");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });
});

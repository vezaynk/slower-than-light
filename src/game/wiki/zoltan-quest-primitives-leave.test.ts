import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const OPENING =
  "You arrive at the primitive planet that you heard about at the cantina and are surprised to see a Zoltan ship facing off against a Rebel assault craft.\n\nYou tap into their frequency and hear the Rebel captain yelling, \"We are liberating this planet in the name of the new Galactic government! These aliens will not be left in ignorance where they cannot be of use!\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-quest-primitives";
  b.name = "Zoltan quest primitives";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan quest primitives");
  assert.equal(g.event?.body, OPENING);
}

describe("Zoltan quest primitives leave", () => {
  it("opening shows the two printed sentences", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, OPENING);
    assert.equal(g.event?.body.includes("Nothing happens"), false);
    assert.equal(g.phase, "event");
  });

  it("leaving shows the printed solution sentence and nothing happens", () => {
    const g = createGame(1);
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    g.fleet = 5;
    choose(g, "c:zoltan-quest-primitives:2");
    assert.equal(g.event?.body, "You don't want to alert the Rebels of your presence and you don't want to anger the Zoltan in their territory. The best solution is to leave.\n\nNothing happens.");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });
});

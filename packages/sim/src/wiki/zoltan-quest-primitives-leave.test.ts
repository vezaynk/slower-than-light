import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const OPENING = "Zoltan ship and Rebel ship over a planet.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ZOLTAN_QUEST_PRIMITIVES";
  b.name = "Quest: planet defense";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Quest: planet defense");
  assert.equal(g.event?.body, OPENING);
}

describe("Zoltan quest primitives leave", () => {
  it("opening shows the two printed sentences", () => {
    // Wiki citations:
    // > "You arrive at the primitive planet that you heard about at the cantina and are surprised to see a Zoltan ship facing off against a Rebel assault craft." — [[Zoltan quest primitives]]
    // > "You tap into their frequency and hear the Rebel captain yelling, \"We are liberating this planet in the name of the new Galactic government! These aliens will not be left in ignorance where they cannot be of use!\"" — [[Zoltan quest primitives]]
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, OPENING);
    assert.equal(g.event?.body.includes("Nothing happens"), false);
    assert.equal(g.phase, "event");
  });

  it("leaving shows the printed solution sentence and nothing happens", () => {
    // Wiki citations:
    // > "You don't want to alert the Rebels of your presence and you don't want to anger the Zoltan in their territory. The best solution is to leave." — [[Zoltan quest primitives]]
    // > "Nothing happens." — [[Zoltan quest primitives]]
    const g = createGame(1);
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    g.fleet = 5;
    choose(g, "c:zoltan-quest-primitives:2");
    assert.equal(
      g.event?.body,
      [eventText("event_ZOLTAN_QUEST_PRIMITIVES_c1_c3_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });
});

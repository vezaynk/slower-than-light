import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const SENTENCE = eventText("event_LANIUS_CIVILIAN_c1_text");

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_CIVILIAN";
  b.name = "Optional fight: Lanius ship and civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Lanius ship and civilian");
}

describe("Lanius ship attacking civilian attack sentence", () => {
  it("attacking shows the printed lead-in on the card and fights a Lanius ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian:0");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(SENTENCE));
    assert.equal(g.log.includes(SENTENCE), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "lanius");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian");
    assert.equal(g.log.includes(SENTENCE), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_ROCK_DISTRESS";
  b.name = "Optional fight: Lanius ship and Rock ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Lanius ship and Rock ship");
}

describe("Lanius ship attacking Rock fight", () => {
  it("attacking shows the printed lead-in on the card and fights a Lanius ship", () => {
    const g = createGame(1);
    open(g);
    const lead =
      eventText("event_LANIUS_ROCK_DISTRESS_c1_text");
    choose(g, "c:lanius-ship-attacking-rock:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-attacking-rock");
    assert.equal(g.scrap, 10);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
  });
});

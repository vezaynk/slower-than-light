import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_CIVILIAN";
  b.name = "Pirate ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Pirate ship attacking civilian stay out", () => {
  it("shows the printed sentence and nothing happens", () => {
    // Wiki citations:
    // > "Stay out of it." — [[Pirate ship attacking civilian]]
    // > "The fight brings them out of your immediate scanning range. After a time the distress calls stop." — [[Pirate ship attacking civilian]]
    // > "Nothing happens." — [[Pirate ship attacking civilian]]
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian:1");
    assert.equal(
      g.event?.body,
      [eventText("event_PIRATE_CIVILIAN_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.notEqual(g.phase, "combat");
  });
});

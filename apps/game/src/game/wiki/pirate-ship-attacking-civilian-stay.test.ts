import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-civilian";
  b.name = "Pirate ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Pirate ship attacking civilian stay out", () => {
  it("shows the printed sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian:1");
    assert.equal(
      g.event?.body,
      "The fight brings them out of your immediate scanning range. After a time the distress calls stop.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.notEqual(g.phase, "combat");
  });
});

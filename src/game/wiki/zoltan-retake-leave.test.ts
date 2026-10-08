import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-retake-the-ship";
  b.name = "Zoltan retake the ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan retake the ship");
}

describe("Zoltan retake the ship leave", () => {
  it("leaving shows the printed drop-off sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-retake-the-ship:1");
    assert.equal(
      g.event?.body,
      "You refuse to get his ship back, but still offer to drop him off at the next station. The Zoltan is displeased, but directs you to a nearby starbase just the same.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});

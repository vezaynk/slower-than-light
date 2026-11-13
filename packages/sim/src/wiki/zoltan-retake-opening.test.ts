import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY = "Pirate-held Zoltan ship. Kill the crew to win.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ZOLTAN_LIFERAFT";
  b.name = "Optional fight: pirate-held Zoltan ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Zoltan retake the ship opening", () => {
  it("prints the request sentence and keeps both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Optional fight: pirate-held Zoltan ship");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:zoltan-retake-the-ship:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:zoltan-retake-the-ship:1"));
  });
});

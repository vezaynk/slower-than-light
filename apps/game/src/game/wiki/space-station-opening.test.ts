import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You come across a space station under construction. You receive a message from their command tower, \"Greetings. We recently lost contact with a cargo ship that was set to deliver more construction materials. Could you help us figure out what happened to them?\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:space-station-under-construction";
  b.name = "Space station under construction";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Space station under construction opening", () => {
  it("prints the request sentence and keeps both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Space station under construction");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:space-station-under-construction:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:space-station-under-construction:1"));
  });
});

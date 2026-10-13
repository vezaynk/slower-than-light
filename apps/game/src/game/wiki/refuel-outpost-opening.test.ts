import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You detect a Rebel scout on an attack approach to a small refueling outpost. Their weapons are charged, but they're not firing yet.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-refueling-outpost";
  b.name = "Rebel ship attacking refueling outpost";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rebel ship attacking refueling outpost opening", () => {
  it("prints the scout approach sentence and keeps both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Rebel ship attacking refueling outpost");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-refueling-outpost:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-refueling-outpost:1"));
  });
});

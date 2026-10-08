import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "A small platform orbits near this beacon - it looks like a fueling station of some sort, and it is cheerily broadcasting reasonable prices in a spectrum of frequencies and languages.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:refueling-platform";
  b.name = "Refueling platform";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Refueling platform opening", () => {
  it("prints the platform sentence and keeps the accept choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Refueling platform");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, createGame(1).fuel);
    assert.ok(g.event?.choices.some((c) => c.id === "c:refueling-platform:0" && c.label === "Accept it"));
  });
});

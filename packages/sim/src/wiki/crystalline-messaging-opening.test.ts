import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY = "Crystal ship. Offer: scrap for a fleet advance.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "CRYSTAL_REQUEST";
  b.name = "Flight-plan offer: scrap or fleet";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Crystalline ship messaging about Rebels opening", () => {
  it("prints the rebel messaging and keeps the flight-plans choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Flight-plan offer: scrap or fleet");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:crystalline-ship-messaging-about-rebels:0"));
  });
});

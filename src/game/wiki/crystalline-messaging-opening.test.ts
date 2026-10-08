import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "The moment you arrive you notice a Crystalline ship in the vicinity keeping its distance. They message you, \"The 'Rebels' that are trying to hunt YOU down are creating havoc everywhere they go.\" \"To minimize their impact on our people, we would like you to give them your flight path out of our sector. We would like to remain civil and are willing to pay you in 'scrap' for the increased danger it poses.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystalline-ship-messaging-about-rebels";
  b.name = "Crystalline ship messaging about Rebels";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Crystalline ship messaging about Rebels opening", () => {
  it("prints the rebel messaging and keeps the flight-plans choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Crystalline ship messaging about Rebels");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:crystalline-ship-messaging-about-rebels:0"));
  });
});

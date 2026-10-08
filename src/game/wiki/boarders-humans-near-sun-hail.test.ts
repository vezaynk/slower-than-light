import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  'You arrive to find yourself extremely close to a star. You receive a message from a pirate ship, "I\'m glad you arrived; our ship is damaged and we were getting desperate... I hope you don\'t mind if we take yours." Hostiles detected on board our ship!';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:boarders-humans-near-sun";
  b.name = "Boarders: Humans near sun";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Boarders: Humans near sun hail", () => {
  it("prints the full opening italic and leaves the boarder choice unpressed", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Boarders: Humans near sun");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.event?.choices[0]?.id, "c:boarders-humans-near-sun:0");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
  });
});

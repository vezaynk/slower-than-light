import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You find two heavily damaged ships floating nearby, the remains of a battle. You begin to harvest some usable debris when you hear the sounds of someone beaming aboard followed by the shouts of a boarding party.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:boarders-humans-in-plasma-storm";
  b.name = "Boarders: Humans in plasma storm";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Boarders: Humans in plasma storm opening", () => {
  it("prints the boarding-party sentence and keeps the scrap choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Boarders: Humans in plasma storm");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:boarders-humans-in-plasma-storm:0"));
  });
});

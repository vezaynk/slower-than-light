import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "The Engi are awaiting you at the beacon, with their weapons on-line! They explain a computer virus that is wanted for hostile acts against the Engi (multiple counts of binary scrambling, nano-dissolution, and variable interference) is aboard your vessel. They insist they must destroy your ship to prevent the virus from escaping!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:the-engi-virus";
  b.name = "The Engi virus";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("The Engi virus opening", () => {
  it("prints the opening sentences and keeps both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "The Engi virus");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:the-engi-virus:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:the-engi-virus:1"));
  });
});

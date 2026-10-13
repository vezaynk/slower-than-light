import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You cross paths with a Mantis ship that looks to have had dozens of layers of armor-plating added over what must have been a hundred year career. Its captain is legendary thief KazaaakplethKilik. Your crew look frightened.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:legendary-thief-kazaaakplethkilik";
  b.name = "Legendary thief KazaaakplethKilik";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Legendary thief KazaaakplethKilik opening", () => {
  it("prints the opening sentence and keeps the fight choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Legendary thief KazaaakplethKilik");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:legendary-thief-kazaaakplethkilik:0"));
  });
});

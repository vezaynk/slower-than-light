import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY = "Hostile Mantis ship. Heavy armor.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "MANTIS_NAMED_THIEF";
  b.name = "Hostile armored Mantis ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Legendary thief KazaaakplethKilik opening", () => {
  it("prints the opening sentence and keeps the fight choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Hostile armored Mantis ship");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:legendary-thief-kazaaakplethkilik:0"));
  });
});

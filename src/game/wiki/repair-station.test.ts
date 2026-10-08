import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  `You see a small station fitted with hundreds of Repair drones. You receive an automated message, "We don't know who you are and we don't care, but this is the right place for some ship repair!"`;

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:repair-station";
  b.name = "Repair station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Repair station");
}

describe("Repair station", () => {
  it("shows the printed station sentence before the repair choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.equal(g.event?.choices.some((c) => c.id === "c:repair-station:0"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:repair-station:3"), true);
  });
});

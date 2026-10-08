import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You detect a refueling platform near the beacon, although its broadcast signal is garbled, and you can't make out the message.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:refueling-platform-garbled-broadcast";
  b.name = "Refueling platform garbled broadcast";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Refueling platform garbled broadcast");
}

describe("Refueling platform garbled broadcast", () => {
  it("shows the printed garbled sentence before the hail and ignore choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.equal(g.event?.choices.some((c) => c.id === "c:refueling-platform-garbled-broadcast:0"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:refueling-platform-garbled-broadcast:1"), true);
  });
});

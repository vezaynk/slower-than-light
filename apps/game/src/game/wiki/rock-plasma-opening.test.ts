import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "A rock armoured transport nearby looks to have lost its bearings, but when you hail they grow suspicious: \"Whatever life-form you are, we find you repugnant. We seek no aid. Leave. Now.\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-ship-in-plasma-storm";
  b.name = "Rock ship in plasma storm";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rock ship in plasma storm opening", () => {
  it("prints the repugnant hail and keeps the leave choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Rock ship in plasma storm");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:rock-ship-in-plasma-storm:1"));
  });
});

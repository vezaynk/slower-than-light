import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  'Your jump interrupts a Zoltan security ship as it follows a Mantis pirate into an asteroid field. They message you, "Your presence here will continue to be tolerated - but please, do not interfere."';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-ship-follows-mantis-ship";
  b.name = "Zoltan ship follows Mantis ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Zoltan ship follows Mantis ship hail", () => {
  it("prints the full opening sentence and the three choices without spending scrap", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Zoltan ship follows Mantis ship");
    assert.equal(g.event?.body, HAIL);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      [
        "c:zoltan-ship-follows-mantis-ship:0",
        "c:zoltan-ship-follows-mantis-ship:1",
        "c:zoltan-ship-follows-mantis-ship:2",
      ],
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
  });
});

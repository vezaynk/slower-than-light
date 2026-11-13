import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "FLOATING_CARGO";
  b.name = "Floating cargo";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Floating cargo");
}

describe("Destroyed cargo ship leave", () => {
  it("leaving the cargo prints the jump sentence and nothing happens", () => {
    // Wiki citations:
    // > "Leave it alone, this looks suspicious." — [[Destroyed cargo ship]]
    // > "You leave the cargo alone and prepare to jump." — [[Destroyed cargo ship]]
    // > "Nothing happens." — [[Destroyed cargo ship]]
    const g = createGame(1);
    open(g);
    g.fleet = 5;
    choose(g, "c:destroyed-cargo-ship:1");
    assert.equal(
      g.event?.body,
      [eventText("event_FLOATING_CARGO_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:destroyed-cargo-ship";
  b.name = "Destroyed cargo ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Destroyed cargo ship");
}

describe("Destroyed cargo ship leave", () => {
  it("leaving the cargo prints the jump sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    g.fleet = 5;
    choose(g, "c:destroyed-cargo-ship:1");
    assert.equal(
      g.event?.body,
      "You leave the cargo alone and prepare to jump.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
  });
});

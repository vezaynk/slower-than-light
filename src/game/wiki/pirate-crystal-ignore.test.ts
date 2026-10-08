import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-crystal";
  b.name = "Pirate ship attacking Crystal";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship attacking Crystal");
}

describe("Pirate ship attacking Crystal ignore", () => {
  it("ignoring them prints the problems sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    g.fleet = 5;
    choose(g, "c:pirate-ship-attacking-crystal:1");
    assert.equal(
      g.event?.body,
      "You assume the Crystalline ship can handle itself. You have enough of your own problems.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
  });
});

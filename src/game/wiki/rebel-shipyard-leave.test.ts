import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-shipyard";
  b.name = "Rebel shipyard";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rebel shipyard leave", () => {
  it("leaving shows the printed mission sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-shipyard:1");
    assert.equal(
      g.event?.body,
      "You feel the mission is the highest priority and it's too risky to stay in such a dangerous location.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});

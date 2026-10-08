import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const SENTENCE = "You charge your weapons, which quickly gets the Lanius ship's attention.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-attacking-civilian";
  b.name = "Lanius ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking civilian");
}

describe("Lanius ship attacking civilian attack sentence", () => {
  it("attacking logs the printed lead-in and fights a Lanius ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian:0");
    assert.ok(g.log.includes(SENTENCE));
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian");
  });
});

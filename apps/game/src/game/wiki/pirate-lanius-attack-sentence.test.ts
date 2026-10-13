import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const SENTENCE = "You charge the weapons, which quickly gets the pirate ship's attention.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-civilian-lanius";
  b.name = "Pirate ship attacking civilian (Lanius)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship attacking civilian (Lanius)");
}

describe("Pirate ship attacking civilian (Lanius) attack sentence", () => {
  it("attacking logs the printed lead-in and fights a Pirate ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian-lanius:0");
    assert.ok(g.log.includes(SENTENCE));
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian-lanius");
  });
});

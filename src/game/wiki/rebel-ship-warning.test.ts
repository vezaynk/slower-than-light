import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-warning";
  b.name = "Rebel ship warning";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship warning");
}

describe("Rebel ship warning", () => {
  it("prints the scout sentence, and the fight choice starts a Rebel ship", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, "You stumble across a forward scout of the Rebel fleet.");
    assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-warning:0"));
    choose(g, "c:rebel-ship-warning:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-ship-warning");
    assert.equal(g.scrap, 10);
  });
});

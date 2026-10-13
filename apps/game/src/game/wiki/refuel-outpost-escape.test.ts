import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-refueling-outpost";
  b.name = "Rebel ship attacking refueling outpost";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship attacking refueling outpost");
}

describe("Rebel ship attacking refueling outpost escape", () => {
  it("fights a Rebel ship that never escapes", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-refueling-outpost:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.fightEvent, "rebel-ship-attacking-refueling-outpost");
    assert.equal(g.enemyEscape?.mode, "never");
  });
});

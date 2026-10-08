import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-near-radar-station";
  b.name = "Auto-ship near radar station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship near radar station");
}

describe("Auto-ship near radar station approach", () => {
  it("approaching prints the power-up sentence and starts an Auto-ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-near-radar-station:0");
    assert.ok(g.log.includes("The ship powers up and targets you."));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-near-radar-station");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.scrap, 10);
  });
});

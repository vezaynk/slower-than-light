import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "AUTO_DEFENSE_RADAR";
  b.name = "Auto-ship near radar station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship near radar station");
}

describe("Auto-ship near radar station approach", () => {
  it("approaching shows the power-up sentence on the card and starts an Auto-ship fight", () => {
    const g = createGame(1);
    open(g);
    const told = "The ship powers up and targets you.";
    choose(g, "c:auto-ship-near-radar-station:0");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(told));
    assert.equal(g.log.includes(told), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "auto");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-near-radar-station");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.scrap, 10);
  });
});

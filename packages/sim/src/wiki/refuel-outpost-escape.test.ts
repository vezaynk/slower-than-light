import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "SQUAT_REFUEL_STATION";
  b.name = "Optional fight: Rebel ship and outpost";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Rebel ship and outpost");
}

describe("Rebel ship attacking refueling outpost escape", () => {
  it("fights a Rebel ship that never escapes", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-refueling-outpost:0");
    const lead = eventText("event_SQUAT_REFUEL_STATION_c1_text");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.fightEvent, "rebel-ship-attacking-refueling-outpost");
    assert.equal(g.enemyEscape?.mode, "never");
  });
});

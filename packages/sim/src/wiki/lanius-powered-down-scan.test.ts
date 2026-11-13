import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_DORMANT_EVENT";
  b.name = "Powered-down Lanius ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Powered-down Lanius ship");
}

describe("Lanius powered-down ship scan", () => {
  it("scanning prints the hibernation sentence and starts a Lanius ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-powered-down-ship:0");
    const lead = eventText("event_LANIUS_DORMANT_EVENT_c1_text");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-powered-down-ship");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.scrap, 10);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "AUTO_WARNING";
  b.name = "Fleeing Auto-ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Fleeing Auto-ship");
}

describe("Auto-ship warning lead-in", () => {
  it("shows the printed FTL sentence on the card and still runs on the 40 second pursuit", () => {
    const g = createGame(1);
    open(g);
    const lead = eventText("ship_REBEL_AUTO_WARNING_escape_text");
    choose(g, "c:auto-ship-warning:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "auto-ship-warning");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemyEscape?.mode, "start");
    assert.equal(g.enemyEscape?.seconds, 40);
    assert.equal(g.enemyEscape?.running, true);
    assert.equal(g.enemyEscape?.pursuit, true);
  });
});

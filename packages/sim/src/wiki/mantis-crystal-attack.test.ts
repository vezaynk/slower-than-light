import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "CRYSTAL_MANTIS_CRYSTAL";
  b.name = "Mantis ship attacking Crystal";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship attacking Crystal");
}

describe("Mantis ship attacking Crystal", () => {
  it("attacking the Mantis prints the lead-in and starts a Mantis ship fight", () => {
    const g = createGame(1);
    open(g);
    const told =
      eventText("event_CRYSTAL_MANTIS_CRYSTAL_c1_text");
    choose(g, "c:mantis-ship-attacking-crystal:0");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(told));
    assert.equal(g.log.includes(told), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.log.includes(told), false);
    assert.equal(g.fightEvent, "mantis-ship-attacking-crystal");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.scrap, 10);
  });

  it("ignoring them prints the low-profile sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    g.fleet = 5;
    choose(g, "c:mantis-ship-attacking-crystal:1");
    assert.equal(
      g.event?.body,
      [eventText("event_CRYSTAL_MANTIS_CRYSTAL_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
  });
});

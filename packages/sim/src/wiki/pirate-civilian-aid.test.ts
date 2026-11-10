import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_CIVILIAN";
  b.name = "Pirate ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship attacking civilian");
}

describe("Pirate ship attacking civilian aid", () => {
  it("aiding the civilian shows the printed lead-in on the card and fights a pirate ship", () => {
    // Wiki citations:
    // > "Aid the civilian ship." — [[Pirate ship attacking civilian]]
    // > "You power up your weapons and engage the pirate ship." — [[Pirate ship attacking civilian]]
    const g = createGame(1);
    open(g);
    const lead = "You power up your weapons and engage the pirate ship.";
    choose(g, "c:pirate-ship-attacking-civilian:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian");
    assert.equal(g.scrap, 10);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
  });
});

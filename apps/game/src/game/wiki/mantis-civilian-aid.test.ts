import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "MANTIS_CIVILIAN";
  b.name = "Mantis ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship attacking civilian");
}

describe("Mantis ship attacking civilian aid", () => {
  it("aiding the civilian shows the printed lead-in and fights a Mantis ship", () => {
    // Wiki citations:
    // > "You frown, power up the weapons and prepare to engage the Mantis ship. Not today." — [[Mantis ship attacking civilian]]
    // > "Fight the Mantis Ship." — [[Mantis ship attacking civilian]]
    const lead =
      "You frown, power up the weapons and prepare to engage the Mantis ship. Not today.";
    const g = createGame(1);
    open(g);
    choose(g, "c:mantis-ship-attacking-civilian:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-ship-attacking-civilian");
    assert.equal(g.scrap, 10);
  });
});

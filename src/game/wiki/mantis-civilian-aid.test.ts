import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-attacking-civilian";
  b.name = "Mantis ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship attacking civilian");
}

describe("Mantis ship attacking civilian aid", () => {
  it("aiding the civilian logs the printed lead-in and fights a Mantis ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:mantis-ship-attacking-civilian:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-ship-attacking-civilian");
    assert.equal(g.scrap, 10);
    assert.ok(g.log.includes("You frown, power up the weapons and prepare to engage the Mantis ship. Not today."));
  });
});

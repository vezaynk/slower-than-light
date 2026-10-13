import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-federation-loyalists";
  b.name = "Rebel ship attacking Federation loyalists";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship attacking Federation loyalists");
}

describe("Rebel ship attacking Federation loyalists", () => {
  it("aiding the Federation ship engages the Rebel ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-federation-loyalists:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-ship-attacking-federation-loyalists");
    assert.equal(g.scrap, 10);
    assert.ok(g.log.includes("You power up your weapons and engage the Rebel ship."));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:the-engi-virus";
  b.name = "The Engi virus";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "The Engi virus");
}

describe("The Engi virus attack", () => {
  it("prints the damned sentence and fights an Engi ship", () => {
    const g = createGame(1);
    open(g);
    const engines = g.player.systems.engines;
    const shields = g.player.systems.shields;
    choose(g, "c:the-engi-virus:1");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "engi");
    assert.equal(g.fightEvent, "the-engi-virus");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.systems.engines, engines);
    assert.equal(g.player.systems.shields, shields);
    assert.ok(g.log.includes("The Engi be damned, no one threatens your ship. You prepare for a fight!"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  "You message the Crystalline ship your intentions and move in to intercept the Rebel ship.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-crystal-ship";
  b.name = "Rebel ship attacking Crystal ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship attacking Crystal ship");
}

describe("Rebel ship attacking Crystal ship attack", () => {
  it("attacking the Rebel shows the printed intercept sentence and starts a Rebel fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-crystal-ship:0");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "rebel-ship-attacking-crystal-ship");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.scrap, 10);
  });
});

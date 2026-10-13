import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  "You move in to intercept the Crystalline ship. As soon as the Rebel scans your ship it takes the opportunity to jump. You have the sneaking suspicion they will inform the fleet of your position, but that's the least of your current concerns.";

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

describe("Rebel ship attacking Crystal ship crystal attack", () => {
  it("attacking the Crystalline ship shows the printed jump sentence and starts a Crystal fight", () => {
    const g = createGame(1);
    open(g);
    const fleet = g.fleet;
    choose(g, "c:rebel-ship-attacking-crystal-ship:1");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "rebel-ship-attacking-crystal-ship");
    assert.equal(g.enemy?.faction, "crystal");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, fleet + 1);
    assert.ok(g.log.includes("Rebel Fleet pursuit is doubled for 1 jump."));
  });
});

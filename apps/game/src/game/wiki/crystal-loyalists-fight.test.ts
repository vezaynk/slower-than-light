import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystal-ship-attacking-federation-loyalists";
  b.name = "Crystal ship attacking Federation loyalists";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crystal ship attacking Federation loyalists");
}

describe("Crystal ship attacking Federation loyalists", () => {
  it("prints the lead-in and fights a Crystal ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:crystal-ship-attacking-federation-loyalists:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "crystal");
    assert.equal(g.fightEvent, "crystal-ship-attacking-federation-loyalists");
    assert.equal(g.scrap, 10);
    assert.ok(
      g.log.includes(
        "It doesn't look like the Fed ship can stand much more pressure. You fly in and intercept the Crystalline ship.",
      ),
    );
  });
});

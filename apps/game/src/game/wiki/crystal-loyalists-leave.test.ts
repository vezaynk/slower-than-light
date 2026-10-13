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

describe("Crystal ship attacking Federation loyalists leave", () => {
  it("leaving shows the printed mission sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:crystal-ship-attacking-federation-loyalists:1");
    assert.equal(
      g.event?.body,
      "With the Federation ship distracting the guard, you are free to continue on your mission.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});

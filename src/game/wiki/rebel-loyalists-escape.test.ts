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
  it("using this chance to escape spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-federation-loyalists:1");
    assert.equal(
      g.event?.body,
      "The Rebel's preoccupation with the Federation ship allows you to slip away undetected. However, you can't help but feel you should have helped them.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.notEqual(g.phase, "combat");
    assert.equal(g.scrap, 10);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  "Detecting the higher threat, the automated ship moves in to engage your ship.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-attacking-outpost";
  b.name = "Auto-ship attacking outpost";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship attacking outpost");
}

describe("Auto-ship attacking outpost intervene", () => {
  it("prints the higher-threat sentence and fights an Auto-ship", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.scrap, 10);
    choose(g, "c:auto-ship-attacking-outpost:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-attacking-outpost");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.scrap, 10);
    assert.ok(g.log.includes(LEAD));
  });
});

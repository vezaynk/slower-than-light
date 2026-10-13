import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-powered-down-ship";
  b.name = "Lanius powered-down ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius powered-down ship");
}

describe("Lanius powered-down ship scan", () => {
  it("scanning prints the hibernation sentence and starts a Lanius ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-powered-down-ship:0");
    assert.ok(g.log.includes("As you scan the vessel, the scan frequencies awaken the Lanius from hibernation - and they're hungry for raw materials!"));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-powered-down-ship");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.scrap, 10);
  });
});

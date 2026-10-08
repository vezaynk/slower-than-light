import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-attacking-civilian-distress";
  b.name = "Lanius ship attacking civilian distress";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking civilian distress");
}

describe("Lanius ship attacking civilian distress fight", () => {
  it("fighting logs the printed lead-in and fights a Lanius ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian-distress:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian-distress");
    assert.equal(g.scrap, 10);
    assert.ok(g.log.includes("You move in to intercept the ship. Detecting a greater threat, the Lanius prepare to fight."));
  });
});

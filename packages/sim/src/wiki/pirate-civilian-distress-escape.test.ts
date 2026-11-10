import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_CIVILIAN_BEACON";
  b.name = "Pirate ship attacking civilian distress";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship attacking civilian distress");
}

describe("Pirate ship attacking civilian distress escape", () => {
  it("fights a Pirate ship that never escapes", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian-distress:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    const told = g.event?.body ?? "";
    assert.equal(told.length > 0, true);
    assert.equal(g.log.includes(told), false);
    assert.equal(g.enemy?.pirate, true);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian-distress");
    assert.equal(g.enemyEscape?.mode, "never");
    assert.equal(g.log.includes(told), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-crystal";
  b.name = "Pirate ship attacking Crystal";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship attacking Crystal");
}

describe("Pirate ship attacking Crystal attack", () => {
  it("attacking prints the chase sentence and starts a Pirate ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-ship-attacking-crystal:0");
    assert.ok(g.log.includes("You chase down the pirate before it has a chance to engage the civilian ship. When it detects the real threat, it turns to face you."));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "pirate-ship-attacking-crystal");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-attacking-crystal";
  b.name = "Mantis ship attacking Crystal";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship attacking Crystal");
}

describe("Mantis ship attacking Crystal", () => {
  it("attacking the Mantis prints the lead-in and starts a Mantis ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:mantis-ship-attacking-crystal:0");
    assert.ok(g.log.includes("You activate your impulse engines and fly between the Mantis and their prey, weapons charging. You appear to have their full attention."));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "mantis-ship-attacking-crystal");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.scrap, 10);
  });
});

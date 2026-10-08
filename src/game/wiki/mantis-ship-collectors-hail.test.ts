import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  'You are immediately hailed by an impressive-looking Mantis ship, "Your ship would make a mighty fine prize. Prepare for battle!"';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-collectors";
  b.name = "Mantis ship-collectors";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis ship-collectors hail", () => {
  it("prints the full opening sentence, then fights a Mantis Fighter", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Mantis ship-collectors");
    assert.equal(g.event?.body, HAIL);
    choose(g, "c:mantis-ship-collectors:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "mantis-ship-collectors");
    assert.equal(g.scrap, 10);
  });
});

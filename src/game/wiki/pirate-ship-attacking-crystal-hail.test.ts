import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  "A pirate ship jumps in right after you arrive at the beacon. It must have followed once the Long-Range Beacon was reactivated. It almost charges a small Crystalline transport ship, weapons armed.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-crystal";
  b.name = "Pirate ship attacking Crystal";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Pirate ship attacking Crystal hail", () => {
  it("prints the full opening sentence, then fights or ignores the pirate", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Pirate ship attacking Crystal");
    assert.equal(g.event?.body, HAIL);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:pirate-ship-attacking-crystal:0", "c:pirate-ship-attacking-crystal:1"],
    );
    choose(g, "c:pirate-ship-attacking-crystal:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-attacking-crystal");
    assert.equal(g.scrap, 10);

    const leave = createGame(2);
    open(leave);
    choose(leave, "c:pirate-ship-attacking-crystal:1");
    assert.notEqual(leave.phase, "combat");
    assert.equal(leave.scrap, 10);
  });
});

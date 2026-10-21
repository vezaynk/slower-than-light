import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_CHOICE";
  b.name = "Pirate toll";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate toll");
}

describe("Pirate toll reject", () => {
  it("rejecting shows the printed lead-in on the card and fights a pirate ship", () => {
    const g = createGame(1);
    open(g);
    const told = '"Too bad... You will regret this decision!"';
    choose(g, "c:pirate-toll:1");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(told));
    assert.equal(g.log.includes(told), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.pirate, true);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-toll");
    assert.equal(g.scrap, 10);
    assert.equal(g.log.includes(told), false);
  });
});

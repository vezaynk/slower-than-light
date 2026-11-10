import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_BRIBER";
  b.name = "Pirate briber";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate briber");
}

describe("Pirate briber attack", () => {
  it("attacking the pirate shows the printed lead-in and starts a pirate fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-briber:1");
    const lead = "The pirate ship stops its pursuit and locks weapons onto your ship.";
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-briber");
    assert.equal(g.scrap, 10);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_STATION_CROPS";
  b.name = "Remote settlement";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Remote settlement");
}

describe("Remote settlement attack", () => {
  it("attacking prints the engage sentence and starts a Pirate ship fight", () => {
    const g = createGame(1);
    open(g);
    const lead = '"You asked for it!" They pull away from the planet and move in to engage.';
    choose(g, "c:remote-settlement:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.fightEvent, "remote-settlement");
    assert.equal(g.enemy?.faction === "pirate" || g.enemy?.pirate === true, true);
    assert.equal(g.scrap, 10);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_SOLO_SALVAGE";
  b.name = "Lanius ship salvager";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship salvager");
}

describe("Lanius ship salvager attack", () => {
  it("attacking shows the printed weapons sentence and fights a Lanius ship", () => {
    const lead =
      "You move in and power up your weapons. Detecting the threat, they stop what they are doing and prepare for a fight.";
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-salvager:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-salvager");
    assert.equal(g.scrap, 10);
  });
});

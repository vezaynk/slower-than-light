import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_MANTIS_DISTRESS";
  b.name = "Lanius ship attacking Mantis";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking Mantis");
}

describe("Lanius ship attacking Mantis fight", () => {
  it("attacking shows the printed fray sentence on the card and fights a Lanius ship", () => {
    const g = createGame(1);
    open(g);
    const lead =
      "The Lanius haven't noticed you yet - but they will. Launching into the fray, you target the Lanius vessel!";
    choose(g, "c:lanius-ship-attacking-mantis:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-attacking-mantis");
    assert.equal(g.scrap, 10);
    assert.equal(g.log.includes(lead), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "There appears to be some sort of research station near a pulsar, although it's hard to tell since a portion of it has been melted. The Lanius ship that has been working at it moves in to intercept you, totally oblivious to the threat of EM pulses.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-fight-near-pulsar";
  b.name = "Lanius fight near pulsar";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius fight near pulsar");
  assert.equal(g.event?.body, BODY);
}

describe("Lanius fight near pulsar", () => {
  it("shows the printed intro, and the fight choice starts a Lanius combat near a pulsar", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:lanius-fight-near-pulsar:0"), true);
    choose(g, "c:lanius-fight-near-pulsar:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-fight-near-pulsar");
    assert.equal(g.pulsar, true);
    assert.equal(g.scrap, 10);
  });
});

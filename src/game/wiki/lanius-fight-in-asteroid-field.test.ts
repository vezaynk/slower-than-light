import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "This beacon appears to have been set up within an asteroid field to access a mining settlement. However, half of the settlement has been disassembled by a number of Lanius scavengers. Their military escort moves in to scare you off.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-fight-in-asteroid-field";
  b.name = "Lanius fight in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Lanius fight in asteroid field");
  assert.equal(g.event?.body, BODY);
}

describe("Lanius fight in asteroid field", () => {
  it("starts the fight inside an asteroid field", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:lanius-fight-in-asteroid-field:0"), true);
    choose(g, "c:lanius-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-fight-in-asteroid-field");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
  });
});

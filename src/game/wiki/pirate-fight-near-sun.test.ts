import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "This beacon has been placed too close to a super-giant class M star! The ship will gradually overheat until you get out of here... or die. A pirate, apparently oblivious to the danger of the sun, moves in to engage.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight-near-sun";
  b.name = "Pirate fight near sun";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight near sun");
}

describe("Pirate fight near sun", () => {
  it("shows the sun intro, and the fight choice starts a pirate combat", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-near-sun:0"));
    const scrap = g.scrap;
    choose(g, "c:pirate-fight-near-sun:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-near-sun");
    assert.equal(g.scrap, scrap);
  });
});

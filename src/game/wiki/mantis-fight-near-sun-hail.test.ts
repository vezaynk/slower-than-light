import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "Who knows why the Mantis would venture so close to a sun. Perhaps it makes for more of a challenge?";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fight-near-sun";
  b.name = "Mantis fight near sun";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis fight near sun", () => {
  it("prints the full opening sentence, then fights a Mantis ship", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Mantis fight near sun");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.scrap, 10);
    choose(g, "c:mantis-fight-near-sun:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-near-sun");
    assert.equal(g.scrap, 10);
  });
});

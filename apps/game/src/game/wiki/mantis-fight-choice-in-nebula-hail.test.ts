import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  'Navigating the fog blind, you practically bump hulls with a Mantis ship. They hail you: "Pah! This transgression will be overlooked. Nebula, very dangerous. Next time, humans all die."';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fight-choice-in-nebula";
  b.name = "Mantis fight choice in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis fight choice in nebula hail", () => {
  it("prints the full opening before the fight and the move-on choice", () => {
    const g = createGame(1);
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    assert.equal(g.event?.title, "Mantis fight choice in nebula");
    assert.equal(g.event?.body, HAIL);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:mantis-fight-choice-in-nebula:0", "c:mantis-fight-choice-in-nebula:1"],
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);

    choose(g, "c:mantis-fight-choice-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-choice-in-nebula");
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(g.scrap, 10);
  });
});

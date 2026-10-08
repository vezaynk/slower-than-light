import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "A Rock mining vessel is harvesting the mineral-rich asteroids in this locality, and their scouts take your presence to be a transgression. Battle stations!",
  "A rookie Rock cargo ship has taken its orders too literally and took the most direct route to their destination... right through an asteroid field. They're confused and fire wildly as you jump in.",
  `The captain of a Rock freighter lost in the asteroid field hails you: "Our co-ordinates led us here, but only death greets us. What must be must be. Death to all." You power up the battle systems and wonder how long they've been stuck here.`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-fight-in-asteroid-field";
  b.name = "Rock fight in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock fight in asteroid field");
}

describe("Rock fight in asteroid field", () => {
  it("shows one of the three intros, and the fight starts inside an asteroid field", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rock-fight-in-asteroid-field:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rock-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rock-fight-in-asteroid-field");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
  });
});

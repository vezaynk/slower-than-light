import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Minute fissures in the shields spark and crackle as the ship jumps into the wake of a huge asteroid. More asteroids follow, as does a lost and aggressive Rock pirate ship.",
  "You exit the jump surrounded by dirt and rocks. Before long a blast is deflected by your shield, but that was no asteroid... Incoming pirate!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-pirates-fight-in-asteroid-field";
  b.name = "Rock pirates fight in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock pirates fight in asteroid field");
}

describe("Rock pirates fight in asteroid field", () => {
  it("shows one of the two intros, and the fight starts inside an asteroid field", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rock-pirates-fight-in-asteroid-field:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rock-pirates-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "rock-pirates-fight-in-asteroid-field");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
  });
});

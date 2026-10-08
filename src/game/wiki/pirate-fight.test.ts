import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "As you jump into the system a pirate advances on your position. They are refusing all hails. Prepare for a fight.",
  `Soon after arriving in the system you are hailed by a small cruiser. "What good fortune that we happen to run into each other. Nothing personal, but you have some information we need!"`,
  `At first it appears you've arrived in an empty system, but a ship appears from behind a planet and hails you: "Haha! I am the dread pirate Tuco, prepare to die!"`,
  `The only other ship at this beacon messages you: "Finally, after months of waiting, someone has fallen into our trap!"`,
  "You barely have time to register jump completion before your ship warns you of an incoming ship with weapons hot.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight";
  b.name = "Pirate fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight");
}

describe("Pirate fight", () => {
  it("shows one of the five intros, and the fight choice starts a pirate combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);
  });
});

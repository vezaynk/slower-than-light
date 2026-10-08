import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Nebulas are known to be popular Mantis hunting grounds. Information you would have done well to heed here.",
  "You detect a Mantis expedition vessel returning home with its haul. So determined are they, in fact, that they don't wait to see if you're hostile before firing.",
  `A Mantis ship, lost in the storm, hails you. "Sensors are out. We have no local telemetry. We will take yours." You detect a power increase in their weapons systems.`,
  `A Mantis ship hails you through the storm: "These are sacred Urggghtnag clan hunting grounds. You are prey." Shields up!`,
  "You notice a Mantis attack ship ducking between the clouds of swirling space stuff; it's hunting you. You try to get the jump and move in to attack.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fight-in-nebula";
  b.name = "Mantis fight in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis fight in nebula");
}

describe("Mantis fight in nebula", () => {
  it("shows one of the five printed intros, then fights a Mantis ship", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-fight-in-nebula:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:mantis-fight-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-in-nebula");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

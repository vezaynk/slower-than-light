import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You spot a Mantis ship hunting in the distance.",
  `A Mantis ship engaging a civilian hails you. Sparks fly about his cockpit as he yells, "Stay out of this human! Else you are next!"`,
  "Local sensors pick up two ships engaged in a heated battle. It seems the Mantis military ship will surely defeat its prey.",
  "A Mantis vessel flashes past your view-screen, weapons and engines at full. A tiny blip on the sensor readout marks its quarry.",
  "You pick up a distress call from a civilian ship. It's being chased by a Mantis ship!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-attacking-civilian";
  b.name = "Mantis ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship attacking civilian");
}

describe("Mantis ship attacking civilian intro", () => {
  it("shows one of the five printed intros, then aids or stays out", () => {
    assert.equal(INTROS.length, 5);
    assert.equal(new Set(INTROS).size, 5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-ship-attacking-civilian:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-ship-attacking-civilian:1"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:mantis-ship-attacking-civilian:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-ship-attacking-civilian");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);

    const stay = createGame(1);
    open(stay);
    choose(stay, "c:mantis-ship-attacking-civilian:1");
    assert.equal(stay.phase, "event");
    assert.match(stay.event?.body ?? "", /Nothing happens/);
    assert.equal(stay.scrap, 10);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-with-rock-body-parts";
  b.name = "Mantis ship with Rock body parts";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship with Rock body parts");
}

describe("Mantis ship with Rock body parts", () => {
  it("attacking prints the lead-in and starts a Mantis ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:mantis-ship-with-rock-body-parts:0");
    assert.ok(g.log.includes("No species deserves a Mantis hunter on their back - time to make the galaxy a little safer. Engage!"));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "mantis-ship-with-rock-body-parts");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.scrap, 10);
  });

  it("ignoring them prints the wait sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    g.fleet = 5;
    choose(g, "c:mantis-ship-with-rock-body-parts:1");
    assert.equal(
      g.event?.body,
      "The Mantis take no interest in your ship - they're lying in wait for the next Rock ship to venture through. You're able to spin up the engines and jump at your leisure.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
  });
});

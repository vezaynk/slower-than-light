import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You see a small station nearby and feel the shudder of shots ringing through the ship. You can't be sure without sensors, but it seems there may be intruders on the ship!",
  `You arrive in the nebula and immediately receive a message from an unknown source, "Prepare to be boarded!" With the static from the nebula, there's no way to tell where they came from, but you hear shots fired on board the ship.`,
  "You see a number of derelict ships near this beacon. After a short time you hear the tell-tale sounds of a teleporter and shouts coming from within the ship. You've been boarded!",
];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Boarders: Humans in nebula",
    tier: "",
    flag: "cited:boarders-humans-in-nebula",
    asteroid: false,
  };
}

function open(g: Game) {
  g.event = citedEvent(g, beacon());
  g.phase = "event";
}

describe("Boarders: Humans in nebula intros", () => {
  it("shows one of the three printed intros, then beams humans with no ship", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.equal(g.event?.choices[0]?.id, "c:boarders-humans-in-nebula:0");
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(2);
    open(g);
    choose(g, "c:boarders-humans-in-nebula:0");
    const humans = g.crew.filter((c) => c.side === "enemy" && c.kin === "plain" && c.aboard === "player");
    assert.ok(humans.length >= 2 && humans.length <= 4, String(humans.length));
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "combat");
  });
});

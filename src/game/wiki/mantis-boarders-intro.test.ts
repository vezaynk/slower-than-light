import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "A derelict and still smoking Mantis vessel floats by. The battle must have been recent; its surviving crew beam aboard. Prepare for a fight!",
  "Your world, all of a sudden, changes. The Mantis are on board your ship.",
  "You hear a grating rattle and a soft clicking. You reach for your pistol.",
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
    name: "Boarders: Mantis",
    tier: "",
    flag: "cited:boarders-mantis",
    asteroid: false,
  };
}

function open(g: Game) {
  g.event = citedEvent(g, beacon());
  g.phase = "event";
}

describe("Boarders: Mantis intros", () => {
  it("shows one of the three printed intros, then beams mantis with no ship", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.equal(g.event?.choices[0]?.id, "c:boarders-mantis:0");
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(2);
    open(g);
    choose(g, "c:boarders-mantis:0");
    const mantis = g.crew.filter((c) => c.side === "enemy" && c.kin === "blade" && c.aboard === "player");
    assert.ok(mantis.length >= 2 && mantis.length <= 4, String(mantis.length));
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "combat");
  });
});

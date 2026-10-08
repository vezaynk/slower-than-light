import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `What appears to be a civilian ship sends a friendly hail. As you approach the vessel, you detect a teleporter signal but it's too late... intruders have beamed aboard!"`,
  `A heavily damaged ship is drifting near this beacon. You receive a communication: "Hello! Nice of you to drop by. As you can see, our ship has seen better days. Yours is looking quite nice, I think we might be taking it from you now." Intruders beam aboard.`,
  "You detect life-signs actually on the beacon itself! A teleporter signal warns you but it's too late, they've beamed from the beacon onto your ship and seem intent on taking it over.",
  "Your ship detects a faint distress signal on a nearby moon. As you approach the rock, warning lights flash as hostiles beam aboard the ship from some hidden location.",
  "As you arrive, you become aware of a small Rebel outpost near the beacon. You are hardly able to bark an order before a small team is beamed aboard your ship. They must have been expecting you...",
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
    name: "Boarders: Humans (Pirate)",
    tier: "",
    flag: "cited:boarders-humans-pirate",
    asteroid: false,
  };
}

function open(g: Game) {
  g.event = citedEvent(g, beacon());
  g.phase = "event";
}

describe("Boarders: Humans (Pirate) intros", () => {
  it("shows one of the five printed intros, then beams humans with no ship", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 120 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.equal(g.event?.choices[0]?.id, "c:boarders-humans-pirate:0");
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(2);
    open(g);
    choose(g, "c:boarders-humans-pirate:0");
    const humans = g.crew.filter((c) => c.side === "enemy" && c.kin === "plain" && c.aboard === "player");
    assert.ok(humans.length >= 3 && humans.length <= 5, String(humans.length));
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "combat");
  });
});

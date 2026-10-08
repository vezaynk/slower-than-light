import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `A Zoltan ship makes contact. "The nature of the day is rotational. The fever is emaciated. The reason is-" They've caught some nasty deep space dementia. Before you can consider finding help for them, they open fire.`,
  "You're surprised when a stationary Zoltan ship opens fire. It appears there are aggressive pugilists even among the 'enlightened'.",
  `You receive a message, "This area is off limits. Submit your ship to processing." It's only one guard ship in a lonely beacon. You decide to fight your way out.`,
  "You discover a number of Zoltan civilian ships fighting off pirates. Unfortunately one ship mistakes your purpose and moves in to attack! They are refusing all communication; you have no choice but to fight.",
  "Like many areas in Zoltan space, the residents of this sector prepared well for Galactic war. The military here seem to have given up reasoning with foreigners, preferring instead to attack on sight!",
  "A Zoltan ship is waiting at this beacon. They request your identification, but radiation from the sun in this system is disrupting your communications. They take your silence for aggression and move in to attack.",
  `The Zoltan ship patrolling this area hails you: "This area is off limits. Secrecy is vital." They power their weapons.`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-fight";
  b.name = "Zoltan fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan fight");
}

describe("Zoltan fight intro", () => {
  it("shows one of the seven printed intros, then fights a Zoltan ship", () => {
    assert.equal(INTROS.length, 7);
    assert.equal(new Set(INTROS).size, 7);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:zoltan-fight:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:zoltan-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "zoltan");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "zoltan-fight");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

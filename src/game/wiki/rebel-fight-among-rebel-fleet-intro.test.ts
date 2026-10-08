import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Although you were expecting the Rebels, you never imagined their fleet could have grown so fast. Your scanners can hardly register them all before a fighter stationed nearby moves in to attack.",
  "This system is flooded with Rebel warships. Luckily your ship's signature is disguised as a civilian transport. Most heavy vessels ignore you but a small fighter is approaching with weapons hot!",
  "You arrive to find a Rebel battalion encircling a nearby planet, launching landing parties. A small scout moves toward your position. Prepare for a fight!",
  "As soon as you arrive you find yourself in the debris of a fierce battle. However, only Rebel warships remain and you find yourself immediately under attack.",
  "Shots fly by and your computer registers multiple weapon locks as soon as you arrive. Evasive action!",
  "What was once a great series of space stations is now nothing but a small ring of debris around the nearby moon. There's no time to mourn the dead; an enemy approaches!",
  "The Federation seems to have put up a good fight. A number of Rebel ships lie broken or wounded. However their overwhelming numbers force the remaining Federation forces to retreat. Hopefully you can get away in time as well.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-among-rebel-fleet";
  b.name = "Rebel fight among Rebel fleet";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight among Rebel fleet");
}

describe("Rebel fight among Rebel fleet intro", () => {
  it("shows one of the seven printed intros, then fights a Rebel ship", () => {
    assert.equal(INTROS.length, 7);
    assert.equal(new Set(INTROS).size, 7);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-among-rebel-fleet:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:rebel-fight-among-rebel-fleet:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-among-rebel-fleet");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

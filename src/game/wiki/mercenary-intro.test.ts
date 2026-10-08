import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

// Six printed intros, no odds. INFERRED: equal.
const INTROS = [
  "You find a mercenary for hire at this Beacon. Their unique skills can sometimes prove to be useful.",
  `A mercenary hails you: "Greetings, friend! We've heard tell of your quest and are here to offer our valuable services."`,
  `There's a ship with pirate markings orbiting the nearby planet. You receive his hail: "Anything is possible, for the right price"`,
  `The captain of this ship claims he can provide "services" as long as you've got the scrap.`,
  "Mercenaries are swarming the galaxy now, knowing that their less-than-legal services are in demand during this period of unrest. One is waiting at this beacon and hails you.",
  `A ship hails you: "Good sir! It seems you're having some troubles with the Rebels. I'd like to help you, but I can't afford the upkeep required on this hunk of junk I'm flying... maybe we can come to an arrangement?"`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:the-mercenary";
  b.name = "The mercenary";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "The mercenary");
}

describe("The mercenary intro", () => {
  it("shows one of the six printed intros, then fights a pirate ship", () => {
    assert.equal(INTROS.length, 6);
    assert.equal(new Set(INTROS).size, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:the-mercenary:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:the-mercenary:1"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:the-mercenary:2"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:the-mercenary:1");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "the-mercenary");
    assert.equal(g.scrap, 10);
  });
});

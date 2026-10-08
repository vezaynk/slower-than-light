import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "As you arrive at the beacon, a hostile ship immediately registers on your scanners. You didn't expect to see Rebels extending their reach into Slug territory. Charge the weapons!",
  "You jump into empty space and are relieved to see your sensors blink back to life. However, you are less pleased to see them immediately register a rebel ship on an approach vector!",
  `You receive a message from a nearby ship, "Looks like our intelligence was correct! Sneaking through the clouds with the Slugs... No one can hide from the rebellion!"`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-slug";
  b.name = "Rebel fight (Slug)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight (Slug)");
}

describe("Rebel fight (Slug)", () => {
  it("shows one of the three intros, and the fight choice starts a Rebel ship combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-slug:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-fight-slug:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-slug");
    assert.equal(g.scrap, 10);
  });
});

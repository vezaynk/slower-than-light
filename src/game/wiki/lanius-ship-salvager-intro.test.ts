import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You come across a single Lanius ship salvaging a small civilian craft. You cannot tell if they attacked the craft or just happened upon it.",
  "There are remnants of a fierce battle here. Scattered among the hulks are small Lanius craft, slowly breaking apart the wrecks. One of the ships is close enough that you could probably attack it without immediately alerting the others.",
  "When you arrive at the beacon you discover what must have been remnants of a large battle. However the vast majority of metal has been striped from the ships, only various plastic and other materials float in a ring around a planet. A lone Lanius ship moves between the wreckage looking for more salvage.",
  "A small asteroid belt is near this jump beacon. It must be mineral-rich since a Lanius ship is docked on a large rock, slowly absorbing parts of it. You could probably get their attention pretty easily.",
  "A Lanius ship is slowly salvaging what remains of a small research station. It's hard to say if it was abandoned or attacked by the Lanius.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-salvager";
  b.name = "Lanius ship salvager";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship salvager");
}

describe("Lanius ship salvager intro", () => {
  it("shows one of the five printed intros, then fights a Lanius ship", () => {
    assert.equal(INTROS.length, 5);
    assert.equal(new Set(INTROS).size, 5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-salvager:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-salvager:1"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-salvager:2"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-salvager:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-ship-salvager");
    assert.equal(g.scrap, 10);
  });
});

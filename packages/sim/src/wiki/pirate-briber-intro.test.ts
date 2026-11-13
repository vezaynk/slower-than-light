import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

// Three printed intros, no odds. INFERRED: equal.
const INTROS = [
  "Pirate ship. Offer: a bribe to leave it alone.",
  "Pirate ship. Offer: a bribe to leave it alone.",
  "Pirate ship. Offer: a bribe to leave it alone.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_BRIBER";
  b.name = "Pirate bribe";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate bribe");
}

describe("Pirate briber intro", () => {
  it("shows one of the three printed intros, then attacks a pirate ship", () => {
    assert.equal(INTROS.length, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-briber:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-briber:1"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    open(g);
    const lead = "The pirate ship stops its pursuit and locks weapons onto your ship.";
    choose(g, "c:pirate-briber:1");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-briber");
    assert.equal(g.scrap, 10);
  });
});

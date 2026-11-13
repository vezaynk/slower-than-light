import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Lanius ship attacking a civilian ship.",
  "Lanius ship attacking a civilian ship.",
  "Lanius ship attacking a civilian ship.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_CIVILIAN";
  b.name = "Optional fight: Lanius ship and civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Lanius ship and civilian");
}

describe("Lanius ship attacking civilian intro", () => {
  it("shows one of the three printed intros, then fights a Lanius ship", () => {
    assert.equal(INTROS.length, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-attacking-civilian:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-attacking-civilian:1"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian:0");
    const lead = "You charge your weapons, which quickly gets the Lanius ship's attention.";
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian");
    assert.equal(g.scrap, 10);
  });
});

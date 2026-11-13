import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const INTROS = [
  "Lanius ship salvaging.",
  "Lanius ship salvaging.",
  "Lanius ship salvaging.",
  "Lanius ship salvaging.",
  "Lanius ship salvaging.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_SOLO_SALVAGE";
  b.name = "Lanius ship salvager";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship salvager");
}

describe("Lanius ship salvager intro", () => {
  it("shows one of the five printed intros, then fights a Lanius ship", () => {
    assert.equal(INTROS.length, 5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-salvager:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-salvager:1"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-salvager:2"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    open(g);
    const lead = eventText("event_LANIUS_SOLO_SALVAGE_c1_text");
    choose(g, "c:lanius-ship-salvager:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-ship-salvager");
    assert.equal(g.scrap, 10);
    assert.equal(g.log.includes(lead), false);
  });
});

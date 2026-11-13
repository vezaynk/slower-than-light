import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

// Six printed intros, no odds. INFERRED: equal.
const INTROS = [
  "Mercenary. Offer: delay the fleet for scrap.",
  "Mercenary. Offer: delay the fleet for scrap.",
  "Mercenary. Offer: delay the fleet for scrap.",
  "Mercenary. Offer: delay the fleet for scrap.",
  "Mercenary. Offer: delay the fleet for scrap.",
  "Mercenary. Offer: delay the fleet for scrap.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "MERCENARY";
  b.name = "Mercenary";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mercenary");
}

describe("The mercenary intro", () => {
  it("shows one of the six printed intros, then fights a pirate ship", () => {
    assert.equal(INTROS.length, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:the-mercenary:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:the-mercenary:1"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:the-mercenary:2"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    open(g);
    const lead = eventText("event_MERCENARY_c3_text");
    choose(g, "c:the-mercenary:1");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "the-mercenary");
    assert.equal(g.scrap, 10);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
  });
});

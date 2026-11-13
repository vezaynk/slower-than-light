import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

// Three printed intros, no odds. INFERRED: equal.
const INTROS = [
  "Rebel ship attacking a Federation ship.",
  "Rebel ship attacking a Federation ship.",
  "Rebel ship attacking a Federation ship.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "REBEL_VS_FEDERATION";
  b.name = "Optional fight: Rebel ship and Federation ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Rebel ship and Federation ship");
}

describe("Rebel ship attacking Federation loyalists intro", () => {
  it("shows one of the three printed intros, then aids against a Rebel ship", () => {
    assert.equal(INTROS.length, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(
        g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-federation-loyalists:0"),
      );
      assert.ok(
        g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-federation-loyalists:1"),
      );
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-federation-loyalists:0");
    const lead = eventText("event_REBEL_VS_FEDERATION_c1_text");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-ship-attacking-federation-loyalists");
    assert.equal(g.scrap, 10);
  });
});

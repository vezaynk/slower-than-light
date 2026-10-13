import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

// Three printed intros, no odds. INFERRED: equal.
const INTROS = [
  "Upon arriving at this beacon, you detect a distress call. Local scans reveal that a Federation transport is under attack from a Rebel scout!",
  "You immediately notice a Rebel ship chasing what appears to be a civilian transport. However you are detecting chatter on an encrypted Federation channel... That transport is carrying Federation loyalists!",
  "Your sensors are picking up a distress call on an encrypted Federation channel. You eventually find a Federation scout being chased by a Rebel fighter!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-federation-loyalists";
  b.name = "Rebel ship attacking Federation loyalists";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship attacking Federation loyalists");
}

describe("Rebel ship attacking Federation loyalists intro", () => {
  it("shows one of the three printed intros, then aids against a Rebel ship", () => {
    assert.equal(INTROS.length, 3);
    assert.equal(new Set(INTROS).size, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-federation-loyalists:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-federation-loyalists:1"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-federation-loyalists:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-ship-attacking-federation-loyalists");
    assert.equal(g.scrap, 10);
  });
});

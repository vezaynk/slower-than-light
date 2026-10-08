import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "This nebula turns out to be the hiding place of a terrified rock crew taking refuge from the Zoltan border police. They don't seem prepared to risk your leaving with their co-ordinates, and open fire!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-fight-in-nebula";
  b.name = "Rock fight in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock fight in nebula");
}

describe("Rock fight in nebula", () => {
  it("shows both printed sentences, and the fight choice starts a Rock ship combat", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:rock-fight-in-nebula:0"));
    choose(g, "c:rock-fight-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rock-fight-in-nebula");
    assert.equal(g.scrap, 10);
  });
});

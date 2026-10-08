import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "There must have been rich pickings for pirates around here up until war broke out. The pirate you encounter here looks worn down, but hungry. You'll have to fight!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight-engi";
  b.name = "Pirate fight (Engi)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight (Engi)");
}

describe("Pirate fight (Engi)", () => {
  it("shows the printed intro, and the fight choice starts a pirate combat", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-engi:0"));
    choose(g, "c:pirate-fight-engi:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-engi");
    assert.equal(g.scrap, 10);
  });
});

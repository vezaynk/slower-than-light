import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ZOLTAN_CREW_SCAN";
  b.name = "Zoltan security checkpoint";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan security checkpoint");
}

describe("Zoltan security checkpoint attack", () => {
  it("attacking shows the printed lead-in on the card and fights a Zoltan ship", () => {
    // Wiki citations:
    // > "You don't have time for this nonsense. Attack!" — [[Zoltan security checkpoint]]
    // > "Expecting resistance, their Energy Shield is raised and ready for combat." — [[Zoltan security checkpoint]]
    // > "Fight a Zoltan ship (default rewards)." — [[Zoltan security checkpoint]]
    const g = createGame(1);
    open(g);
    const lead = "Expecting resistance, their Energy Shield is raised and ready for combat.";
    choose(g, "c:zoltan-security-checkpoint:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "zoltan");
    assert.equal(g.fightEvent, "zoltan-security-checkpoint");
    assert.equal(g.scrap, 10);
  });
});

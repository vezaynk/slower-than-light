import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { escapePlan, hullRunSeconds } from "../rules/escape.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "BOSS_SCOUT_RESCUE";
  b.name = "Optional fight: Rebel ship (Last Stand)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Rebel ship (Last Stand)");
}

describe("Rebel ship attacking civilians in Last Stand escape", () => {
  // BOSS_SCOUT_RESCUE: `<escape chance="0.5" min="4" max="8">`. Hull points. No timer, so the 15 s hull run.
  it("runs the scout ship's 0.5 chance at 4–8 hull, on the 15 second timer", () => {
    const plain = escapePlan({ tier: "pool", faction: "rebel" }, () => 0);
    assert.equal(plain.threshold, 30);

    const g = createGame(1);
    open(g);
    const lead = eventText("event_BOSS_SCOUT_RESCUE_c1_text");
    choose(g, "c:rebel-ship-attacking-civilians-in-last-stand:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.fightEvent, "rebel-ship-attacking-civilians-in-last-stand");
    assert.equal(g.enemyEscape?.chance, 0.5);
    assert.equal(g.enemyEscape?.hullPoints, true);
    assert.equal(g.enemyEscape?.seconds, hullRunSeconds());
    const threshold = g.enemyEscape?.threshold ?? -1;
    assert.ok(threshold >= 4 && threshold <= 8);
    const under = g.enemy!.hull > 0 && g.enemy!.hull <= threshold;
    assert.equal(g.enemyEscape?.running, under);
    assert.equal(g.enemyEscape?.mode, under ? "start" : "hull");
  });
});

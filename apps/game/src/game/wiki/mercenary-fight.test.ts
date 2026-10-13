import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:the-mercenary";
  b.name = "The Mercenary";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "The mercenary");
}

describe("The Mercenary fight", () => {
  it("fighting logs the printed lead-in and fights a pirate ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:the-mercenary:1");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "the-mercenary");
    assert.equal(g.scrap, 10);
    assert.ok(g.log.includes("Mercenaries are worse than rebels. The only honorable course is to engage the mercenary in battle."));
  });

  it("hiring shows the printed mask sentence and delays the fleet", () => {
    const g = createGame(1);
    open(g);
    g.scrap = 40;
    g.fleet = 6;
    choose(g, "c:the-mercenary:0");
    assert.equal(g.phase, "event");
    assert.match(g.event?.body ?? "", /masks its jump signature/);
    assert.match(g.event?.body ?? "", /delayed for 2 turns/);
    assert.equal(g.fleet, 4);
    assert.ok(g.scrap <= 30 && g.scrap >= 15, String(g.scrap));
    assert.equal(g.enemy, null);
  });
});

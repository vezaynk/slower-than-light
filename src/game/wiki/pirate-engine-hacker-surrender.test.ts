import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { surrenderPlan } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-engine-hacker";
  b.name = "Pirate engine hacker";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate engine hacker");
}

describe("Pirate engine hacker surrender", () => {
  it("never surrenders; a Pirate ship with no event still can", () => {
    // Pirate engine hacker: the ship ("PIRATE_NO_ESCAPE") doesn't surrender. The page prints no percent.
    assert.equal(
      surrenderPlan({ tier: "pool", faction: "pirate", pirate: true, event: "pirate-engine-hacker" }, () => 0.5).chance,
      0,
    );
    assert.equal(surrenderPlan({ tier: "pool", faction: "pirate", pirate: true }, () => 0.5).chance, 50);

    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-engine-hacker:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-engine-hacker");
    assert.equal(g.enemySurrender?.chance, 0);
  });
});

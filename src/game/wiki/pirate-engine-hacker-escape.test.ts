import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

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

describe("Pirate engine hacker escape", () => {
  it("fights a Pirate ship that never escapes", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-engine-hacker:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-engine-hacker");
    assert.equal(g.enemyEscape?.mode, "never");
  });
});

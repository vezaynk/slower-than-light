import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-attacking-slug";
  b.name = "Lanius ship attacking Slug";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking Slug");
}

describe("Lanius ship attacking Slug escape", () => {
  it("fights a Lanius ship that never escapes", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-slug:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-attacking-slug");
    assert.equal(g.enemyEscape?.mode, "never");
  });
});

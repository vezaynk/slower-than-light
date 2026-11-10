import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_MANTIS_DISTRESS";
  b.name = "Lanius ship attacking Mantis";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking Mantis");
}

describe("Lanius ship attacking Mantis escape", () => {
  it("fights a Lanius ship that never escapes", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-mantis:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "lanius");
    const told = g.event?.body ?? "";
    assert.equal(told.length > 0, true);
    assert.equal(g.log.includes(told), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-attacking-mantis");
    assert.equal(g.enemyEscape?.mode, "never");
    assert.equal(g.log.includes(told), false);
  });
});

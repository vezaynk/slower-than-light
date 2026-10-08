import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-warning";
  b.name = "Auto-ship warning";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship warning");
}

describe("Auto-ship warning lead-in", () => {
  it("logs the printed FTL sentence and still runs on the 40 second pursuit", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-warning:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "auto-ship-warning");
    assert.equal(g.scrap, 10);
    assert.ok(g.log.includes("The ship starts to power up its FTL Drive. If it gets away, it will no doubt warn the fleet of your position!"));
    assert.equal(g.enemyEscape?.mode, "start");
    assert.equal(g.enemyEscape?.seconds, 40);
    assert.equal(g.enemyEscape?.running, true);
    assert.equal(g.enemyEscape?.pursuit, true);
  });
});

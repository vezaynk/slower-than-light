import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { escapePlan, HULL_RUN_SECONDS } from "./escape.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-civilians-in-last-stand";
  b.name = "Rebel ship attacking civilians in Last Stand";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship attacking civilians in Last Stand");
}

describe("Rebel ship attacking civilians in Last Stand escape", () => {
  it("runs at 50% once hull is 40-80%, on the typical 15 second timer", () => {
    const low = escapePlan(
      { tier: "pool", faction: "rebel", event: "rebel-ship-attacking-civilians-in-last-stand" },
      () => 0,
    );
    assert.deepEqual([low.mode, low.chance, low.threshold, low.seconds], ["hull", 50, 40, HULL_RUN_SECONDS]);
    const high = escapePlan(
      { tier: "pool", faction: "rebel", event: "rebel-ship-attacking-civilians-in-last-stand" },
      () => 1,
    );
    assert.equal(high.threshold, 80);
    const plain = escapePlan({ tier: "pool", faction: "rebel" }, () => 0);
    assert.equal(plain.threshold, 30);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-civilians-in-last-stand:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.fightEvent, "rebel-ship-attacking-civilians-in-last-stand");
    assert.equal(g.enemyEscape?.mode, "hull");
    assert.equal(g.enemyEscape?.chance, 50);
    assert.equal(g.enemyEscape?.seconds, HULL_RUN_SECONDS);
    const threshold = g.enemyEscape?.threshold ?? -1;
    assert.ok(threshold >= 40 && threshold <= 80);
  });
});

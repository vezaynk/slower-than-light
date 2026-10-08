import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:refueling-platform-garbled-broadcast";
  b.name = "Refueling platform garbled broadcast";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Refueling platform garbled broadcast");
}

describe("Refueling platform garbled broadcast", () => {
  it("hailing prints the screech sentence and starts a Lanius ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:refueling-platform-garbled-broadcast:0");
    assert.ok(g.log.includes("There is a screech from your comm system, and the broadcast suddenly cuts off. The platform suddenly begins to move, revealing itself to be a Lanius ship!"));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "refueling-platform-garbled-broadcast");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.scrap, 10);
  });
});

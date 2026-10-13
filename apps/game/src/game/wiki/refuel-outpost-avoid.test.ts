import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-refueling-outpost";
  b.name = "Rebel ship attacking refueling outpost";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship attacking refueling outpost");
}

describe("Rebel ship attacking refueling outpost avoid", () => {
  it("avoiding the conflict shows the printed warning-shots sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-refueling-outpost:1");
    assert.equal(
      g.event?.body,
      "The Rebel ship fires some warning shots but eventually powers down their weapons. The outpost seems to have given them what they demanded.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});

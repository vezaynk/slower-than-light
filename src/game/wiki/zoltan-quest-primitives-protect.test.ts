import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  "These creatures should be left to develop at their own pace. You direct all weapons on the Rebel ship and begin the firing sequence.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-quest-primitives";
  b.name = "Zoltan quest primitives";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan quest primitives");
}

describe("Zoltan quest primitives protect", () => {
  it("protecting the aliens shows the printed firing sentence and starts a Rebel fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-quest-primitives:1");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "zoltan-quest-primitives");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.scrap, 10);
  });
});

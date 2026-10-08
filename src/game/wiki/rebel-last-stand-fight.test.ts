import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

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

describe("Rebel ship attacking civilians in Last Stand fight", () => {
  it("attacking logs the printed lead-in and fights a Rebel ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-civilians-in-last-stand:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.fightEvent, "rebel-ship-attacking-civilians-in-last-stand");
    assert.equal(g.scrap, 10);
    assert.ok(g.log.includes("You move in to intercept."));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-ship-follows-mantis-ship";
  b.name = "Zoltan ship follows Mantis ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan ship follows Mantis ship");
}

describe("Zoltan ship follows Mantis ship leave", () => {
  it("leaving shows the printed business sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-ship-follows-mantis-ship:2");
    assert.equal(
      g.event?.body,
      "The Zoltan know their business better than most - best to leave them to it. You prepare to jump.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});

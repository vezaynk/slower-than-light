import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystal-fight-choice";
  b.name = "Crystal fight choice";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crystal fight choice");
}

describe("Crystal fight choice leave", () => {
  it("leaving them alone prints the jump sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    g.fleet = 5;
    choose(g, "c:crystal-fight-choice:1");
    assert.equal(
      g.event?.body,
      "It's best to take advantage of the rare occasions when the Rebels aren't shooting at you. You prepare to jump.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:federation-deserters";
  b.name = "Federation deserters";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Federation deserters");
}

describe("Federation deserters leave", () => {
  it("leaving shows the printed warning sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:federation-deserters:1");
    assert.equal(
      g.event?.body,
      "You send them a friendly warning regarding the armada of Rebel ships pursuing you, and then get underway lest they catch you up.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});

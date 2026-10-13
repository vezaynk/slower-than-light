import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "For a moment you assume it's a glitch, but no... you've found a Federation military ship! They hail you and, after some probing, reveal that they deserted the Federation fleet before stumbling into this sector while seeking refuge.";

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

describe("Federation deserters opening", () => {
  it("shows the printed opening sentence and keeps the three printed choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:federation-deserters:2", "c:federation-deserters:0", "c:federation-deserters:1"],
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
  });
});

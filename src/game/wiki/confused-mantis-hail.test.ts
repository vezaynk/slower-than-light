import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  'As soon as you jump into the system, you receive a hail from a nearby civilian Engi vessel. Their Captain appears on your screen: "Strange bug. Can you assist in debugging?"';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:confused-mantis";
  b.name = "Confused Mantis";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Confused Mantis hail", () => {
  it("prints the full opening sentence and both choices without spending scrap", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Confused Mantis");
    assert.equal(g.event?.body, HAIL);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:confused-mantis:0", "c:confused-mantis:1"],
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
  });
});

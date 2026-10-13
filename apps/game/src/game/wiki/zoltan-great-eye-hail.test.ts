import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  'Inside this nebula you detect a rogue planet drifting through space, on its surface a huge monolith visible at this distance even to the naked eye. A Zoltan elder hails you from the planet. "Through luck or intent, you have discovered the Great Eye. Look into its depths and receive your just deserts."';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-great-eye";
  b.name = "Zoltan Great Eye";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Zoltan Great Eye hail", () => {
  it("prints the full opening and the two choices without spending scrap", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Zoltan Great Eye");
    assert.equal(g.event?.body, HAIL);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:zoltan-great-eye:0", "c:zoltan-great-eye:1"],
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
  });
});

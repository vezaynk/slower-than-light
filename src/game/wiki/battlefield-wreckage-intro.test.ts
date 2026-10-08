import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent } from "./filler-events.ts";

const INTROS = [
  "What at first seems to be a simple nebula is actually filled with a good amount of debris from a brutal exchange between several ships. Wreckage drifts by your screens and tumbles into the depths of the nebula to be lost to sight. It's hard to determine who the combatants were without closer investigation.",
  "You have jumped into the aftermath of what seems to have been a brutal exchange between several ships. Wreckage drifts by your screens, and you can still see the remains of the dying ships sparking and breaking apart. It's hard to determine who the combatants were without closer investigation.",
];

function open(g: Game) {
  const b: Beacon = {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Battlefield wreckage",
    tier: "",
    flag: "filler:battlefield-wreckage",
    asteroid: false,
  };
  g.beacons = [b];
  g.here = "b";
  g.event = fillerEvent(g, b);
  g.phase = "event";
}

describe("Battlefield wreckage intros", () => {
  it("shows one of the two printed opening intros and keeps the three choices", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      const ids = (g.event?.choices ?? []).map((c) => c.id);
      assert.deepEqual(ids, ["c:battlefield-wreckage:0", "c:battlefield-wreckage:1", "c:battlefield-wreckage:2"]);
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);
  });
});

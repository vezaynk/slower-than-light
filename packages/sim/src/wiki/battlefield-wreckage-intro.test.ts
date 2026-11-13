import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent } from "./filler-events.ts";

const INTROS = ["Wreckage.", "Wreckage."];

function open(g: Game) {
  const b: Beacon = {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Wreckage: search",
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
    for (let seed = 1; seed <= 40 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      const ids = (g.event?.choices ?? []).map((c) => c.id);
      assert.deepEqual(ids, [
        "c:battlefield-wreckage:0",
        "c:battlefield-wreckage:1",
        "c:battlefield-wreckage:2",
      ]);
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);
  });
});

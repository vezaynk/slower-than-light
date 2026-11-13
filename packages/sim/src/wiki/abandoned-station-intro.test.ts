import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent } from "./filler-events.ts";

const INTROS = ["Empty station.", "Empty station.", "Empty station."];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Empty station",
    tier: "",
    flag: "filler:abandoned-station",
    asteroid: false,
  };
}

function open(g: Game) {
  g.beacons = [beacon()];
  g.here = "b";
  g.event = fillerEvent(g, g.beacons[0]!);
  g.phase = "event";
}

describe("Abandoned station intros", () => {
  it("shows one of the three printed opening intros and keeps examine and stay", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      const ids = (g.event?.choices ?? []).map((c) => c.id);
      assert.deepEqual(ids, ["c:abandoned-station:0", "c:abandoned-station:1"]);
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent } from "./filler-events.ts";

const INTROS = [
  "You arrive to find what appears to be a colonized moon, however scans show it has been abandoned. You also detect an abandoned space station near the Beacon.",
  "You find a small space station that appears to be abandoned.",
  "This area shows signs of a battle some time ago. There are scattered remains of ships but one station appears to be intact.",
];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Abandoned station",
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
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      const ids = (g.event?.choices ?? []).map((c) => c.id);
      assert.deepEqual(ids, ["c:abandoned-station:0", "c:abandoned-station:1"]);
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent } from "./filler-events.ts";

const INTROS = [
  "Request: find a Rebel ship in this system.",
  "Request: find a Rebel ship in this system.",
  "Request: find a Rebel ship in this system.",
  "Request: find a Rebel ship in this system.",
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
    name: "Optional fight: hidden Rebel ship",
    tier: "",
    flag: "filler:rebel-fight-chance",
    asteroid: false,
  };
  g.beacons = [b];
  g.here = "b";
  g.event = fillerEvent(g, b);
  g.phase = "event";
}

describe("Rebel fight chance intros", () => {
  it("shows one of the four printed opening intros and keeps the four choices", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      const ids = (g.event?.choices ?? []).map((c) => c.id);
      assert.deepEqual(ids, [
        "c:rebel-fight-chance:0",
        "c:rebel-fight-chance:1",
        "c:rebel-fight-chance:2",
        "c:rebel-fight-chance:3",
      ]);
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);
  });
});

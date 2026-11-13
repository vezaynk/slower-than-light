import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Free salvage.",
  "Free salvage.",
  "Free salvage.",
  "Free salvage.",
  "Free salvage.",
  "Free salvage.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "FREE_ITEMS";
  b.name = "Free scrap with resources";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Free scrap with resources");
}

describe("Free scrap with resources intro", () => {
  it("shows one of the six printed intros and keeps the medium-scrap choice", () => {
    assert.equal(INTROS.length, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:free-scrap-with-resources:0"));
      assert.equal(g.phase, "event");
      assert.equal(g.scrap, 10);
      assert.equal(g.enemy, null);
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);
  });
});

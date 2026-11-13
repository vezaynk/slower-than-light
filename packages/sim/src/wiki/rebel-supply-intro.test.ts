import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Rebel ship supplying civilians.",
  "Rebel ship supplying civilians.",
  "Rebel ship supplying civilians.",
  "Rebel ship supplying civilians.",
  "Rebel ship supplying civilians.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "REBEL_HELPERS";
  b.name = "Optional fight: Rebel supply ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Rebel supply ship");
}

describe("Rebel ship supplying civilians intro", () => {
  it("shows one of the five printed intros, with Attack and Leave still available", () => {
    assert.equal(INTROS.length, 5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-supplying-civilians:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-supplying-civilians:1"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);
  });
});

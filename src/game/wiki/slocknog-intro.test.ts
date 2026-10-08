import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  'You detect life signs on a nearby moon - a lone Slug marooned on its surface. "Ah, a sssentient ssspecies, after all this time. I am Slocknog, a wandering hero ssseeking adventure. You may hire me for a ssmall sssum."';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.kind = "event";
  b.flag = "cited:slocknog";
  b.name = "Slocknog";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  return b;
}

describe("Slocknog", () => {
  it("shows the printed hire sentence", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slocknog:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:slocknog:1"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY = "Shipyard. A second flagship is docked.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "FLAGSHIP_CONSTRUCTION";
  b.name = "Rebel shipyard";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rebel shipyard opening", () => {
  it("prints the shipyard sentence and keeps both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Rebel shipyard");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.unlocked, undefined);
    assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-shipyard:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-shipyard:1"));
  });
});

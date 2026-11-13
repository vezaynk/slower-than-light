import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "Hostile Crystal ship.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "CRYSTAL_HUNTER";
  b.name = "Hostile Crystal ship: crew surrender";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Crystal fight with surrender offer (Human crew) opening", () => {
  it("prints the crystalline hunter sentence and keeps the fight choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Hostile Crystal ship: crew surrender");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(
      g.event?.choices.some((c) => c.id === "c:crystal-fight-with-surrender-offer-human-crew:0"),
    );
  });
});

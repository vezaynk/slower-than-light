import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY = "Hostile Slug ship. Medbay hacked. 2 Slug boarders.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "NEBULA_SLUG_MEDBAY";
  b.name = "Hostile Slug ship: medbay hack";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Slug hacker (medical) opening", () => {
  it("prints the radiation hail and keeps the continue choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Hostile Slug ship: medbay hack");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-medical:0"));
  });
});

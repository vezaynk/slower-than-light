import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "A large convoy of lumbering civilian ships appears to be passing through this region. You show no hostile intentions, but they are taking no chances, immediately sending their escort to attack!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystal-fight-with-surrender-offer-hull-repairs";
  b.name = "Crystal fight with surrender offer (hull repairs)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Crystal fight with surrender offer (hull repairs) opening", () => {
  it("prints the convoy sentence and keeps the fight choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Crystal fight with surrender offer (hull repairs)");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:crystal-fight-with-surrender-offer-hull-repairs:0"));
  });
});

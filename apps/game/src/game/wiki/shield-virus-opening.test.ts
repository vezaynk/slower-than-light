import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "Your arrival is greeted by numerous computer alerts. The nearby automated Rebel scout has deployed a virus and disrupted your shield system. Hopefully it won't cause further problems before you can destroy it.";

const HACKING =
  "Your hacking system automatically counters the digital assault and you move in to fight the ship.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-carrying-shield-virus";
  b.name = "Auto-ship carrying shield virus";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Auto-ship carrying shield virus opening", () => {
  it("prints the computer-alert arrival and keeps the continue choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Auto-ship carrying shield virus");
    assert.equal(g.event?.body, BODY);
    assert.notEqual(g.event?.body, HACKING);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:auto-ship-carrying-shield-virus:0"));
  });
});

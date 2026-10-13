import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You come to a quiet part of Zoltan space and encounter an ancient Zoltan wise man who has managed to harness the power of a spatial rift, but seems to have been driven completely mad by the power. \"Choose your doom,\" he demands. This is all part of a day's work.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-wise-man";
  b.name = "Zoltan wise man";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Zoltan wise man opening", () => {
  it("prints the wiki opening sentence and keeps the Mantis choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Zoltan wise man");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:zoltan-wise-man:0"));
  });
});

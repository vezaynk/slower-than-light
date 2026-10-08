import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You pick up a Zoltan life raft floating in space. Its inhabitant asks you to retake his ship from the pirates who recently commandeered it. \"I'm certain it is clear,\" he concludes, \"that you must not destroy my vessel in the process.\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-retake-the-ship";
  b.name = "Zoltan retake the ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Zoltan retake the ship opening", () => {
  it("prints the request sentence and keeps both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Zoltan retake the ship");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:zoltan-retake-the-ship:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:zoltan-retake-the-ship:1"));
  });
});

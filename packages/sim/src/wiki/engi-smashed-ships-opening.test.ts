import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "Two damaged Engi ships.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ENGI_SEX";
  b.name = "Optional fight: two Engi ships";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Engi smashed ships opening", () => {
  it("prints the wiki opening sentence and keeps the pry-apart choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Optional fight: two Engi ships");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:engi-smashed-ships:0"));
  });
});

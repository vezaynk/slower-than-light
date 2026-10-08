import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "What appeared to be a single damaged ship is in fact two ships that have smashed into each other... there is a flurry of comm signals and damage, and it's hard to determine what occurred. The vessels appear to be... Engi? They look locked together by the impact and can't free themselves.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:engi-smashed-ships";
  b.name = "Engi smashed ships";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Engi smashed ships opening", () => {
  it("prints the wiki opening sentence and keeps the pry-apart choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Engi smashed ships");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:engi-smashed-ships:0"));
  });
});

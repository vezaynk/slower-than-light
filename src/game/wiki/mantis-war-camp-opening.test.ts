import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You receive a request, \"All of our military ships have been destroyed or damaged during the rebellion. However, there have been reports of a Mantis war camp only a few jumps from us. Can you help?\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-war-camp";
  b.name = "Mantis war camp";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis war camp opening", () => {
  it("prints the request sentence and keeps both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Mantis war camp");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-war-camp:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-war-camp:1"));
  });
});

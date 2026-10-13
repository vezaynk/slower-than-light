import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "The slugs here use a tactic you hoped you'd never see: They sabotage your oxygen production system and then charge fire-weapons - you're going to suffocate!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-oxygen";
  b.name = "Slug hacker (oxygen)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Slug hacker (oxygen) opening", () => {
  it("prints the sabotage sentence and keeps the continue choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Slug hacker (oxygen)");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-oxygen:0"));
  });
});

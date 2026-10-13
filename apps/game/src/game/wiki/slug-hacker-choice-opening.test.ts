import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You are immediately hailed by a dangerous looking ship. \"I'm feeling generouss today. I shall allow you to choose your own death. Which do you like leasst: shields, oxygen, or weaponsss?\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-choice";
  b.name = "Slug hacker (choice)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Slug hacker (choice) opening", () => {
  it("prints the hail sentence and keeps the shields choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Slug hacker (choice)");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-choice:0"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  `Upon completing your jump, you receive a message from a nearby ship. "Greetings and welcome to our beacon! For a small fee, we'll let you continue on your way."`;

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-toll";
  b.name = "Pirate toll";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate toll");
}

describe("Pirate toll", () => {
  it("shows the printed toll sentence before pay and reject", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.equal(g.event?.choices.some((c) => c.id === "c:pirate-toll:0"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:pirate-toll:1"), true);
  });

  it("paying logs the printed friend sentence and spends 15 to 25 scrap", () => {
    const g = createGame(1);
    open(g);
    g.scrap = 40;
    choose(g, "c:pirate-toll:0");
    assert.equal(g.phase, "event");
    assert.match(g.event?.body ?? "", /You made the right decision, friend/);
    assert.match(g.event?.body ?? "", /You avoid the fight/);
    assert.ok(g.scrap <= 25 && g.scrap >= 15, String(g.scrap));
    assert.equal(g.enemy, null);
  });
});

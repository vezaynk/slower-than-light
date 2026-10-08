import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  `"I really am feeling generousss..." They take the scrap and leave.\n\nYou avoided the fight.`;

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-choice";
  b.name = "Slug hacker (choice)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (choice)");
}

describe("Slug hacker (choice) pay to leave", () => {
  it("spends 35 scrap and shows the printed leave sentence", () => {
    const g = createGame(1);
    open(g);
    g.scrap = 40;
    choose(g, "c:slug-hacker-choice:3");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.event?.body, BODY);
  });

  it("does not spend scrap the ship does not have", () => {
    const g = createGame(2);
    open(g);
    assert.equal(g.scrap, 10);
    choose(g, "c:slug-hacker-choice:3");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.event?.body.includes("generousss"), false);
  });
});

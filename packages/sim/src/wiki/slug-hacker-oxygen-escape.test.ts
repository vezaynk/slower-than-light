import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "NEBULA_SLUG_OXYGEN";
  b.name = "Slug hacker (oxygen)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (oxygen)");
}

describe("Slug hacker (oxygen) escape", () => {
  it("loads JELLY_STATUS_OXYGEN_FIRE, which has no <escape>, so the Slug row applies", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:slug-hacker-oxygen:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.fightEvent, "slug-hacker-oxygen");
    assert.equal(g.fightShip, "JELLY_STATUS_OXYGEN_FIRE");
    assert.equal(g.enemyEscape?.mode, "hull");
    assert.equal(g.enemyEscape?.hullPoints, undefined);
    assert.equal(g.enemyEscape?.chance, 50);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { surrenderPlan } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-oxygen";
  b.name = "Slug hacker (oxygen)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (oxygen)");
}

describe("Slug hacker (oxygen) surrender", () => {
  it("never surrenders; a Slug ship with no event still can", () => {
    // Slug hacker (oxygen): the enemy ship doesn't surrender. The page prints no percent.
    assert.equal(surrenderPlan({ tier: "pool", faction: "slug", event: "slug-hacker-oxygen" }, () => 0.5).chance, 0);
    assert.equal(surrenderPlan({ tier: "pool", faction: "slug" }, () => 0.5).chance, 50);

    const g = createGame(1);
    open(g);
    choose(g, "c:slug-hacker-oxygen:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.fightEvent, "slug-hacker-oxygen");
    assert.equal(g.enemySurrender?.chance, 0);
  });
});

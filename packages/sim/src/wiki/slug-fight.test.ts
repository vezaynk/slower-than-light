import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";

const BODY =
  "It's rare for the Slugs to stay exposed in open space for long periods - the ship here may be lost, or just passing through, but either way he moves in to attack!";

describe("Slug fight", () => {
  it("shows the arrival card, then starts the Slug fight", () => {
    // Wiki citations:
    // > "It's rare for the Slugs to stay exposed in open space for long periods - the ship here may be lost, or just passing through, but either way he moves in to attack!" — [[Slug fight]]
    // > "Fight a Slug ship (default rewards)." — [[Slug fight]]
    // The page has no choice. "Fight a Slug ship (default rewards)."
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "SLUG_FIGHT";
    dest.name = "Slug fight";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.log.includes(BODY), false);
    assert.equal(g.event?.choices[0]?.id, "c:slug-fight:0");
    assert.equal(g.fleet, 1);
    choose(g, "c:slug-fight:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "slug-fight");
    assert.equal(g.flare, false);
    assert.equal(g.asteroid, false);
    assert.equal(g.log.includes(BODY), false);
  });
});

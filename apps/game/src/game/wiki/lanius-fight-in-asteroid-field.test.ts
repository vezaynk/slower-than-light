import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "This beacon appears to have been set up within an asteroid field to access a mining settlement. However, half of the settlement has been disassembled by a number of Lanius scavengers. Their military escort moves in to scare you off.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-fight-in-asteroid-field";
  b.name = "Lanius fight in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Lanius fight in asteroid field");
  assert.equal(g.event?.body, BODY);
}

describe("Lanius fight in asteroid field", () => {
  it("starts the fight inside an asteroid field", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:lanius-fight-in-asteroid-field:0"), true);
    choose(g, "c:lanius-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-fight-in-asteroid-field");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
  });

  it("starts the Lanius ship inside an asteroid field on arrival and leaves no button", () => {
    // The page has no choice. The printed sentence, then "Fight a Lanius ship." asteroidfield=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:lanius-fight-in-asteroid-field";
    dest.name = "Lanius fight in asteroid field";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.asteroid, true);
    assert.equal(g.flare, false);
    assert.equal(g.fightEvent, "lanius-fight-in-asteroid-field");
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes(BODY));
  });
});

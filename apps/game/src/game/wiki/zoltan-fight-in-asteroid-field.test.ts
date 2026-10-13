import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You arrive in an asteroid field and are greeted by a Zoltan guard, \"By attempting to access these closed mining fields, you are in violation of the Natural Mineral Protection Act. Your weaponry will be confiscated for processing.\" You don't have time for this.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-fight-in-asteroid-field";
  b.name = "Zoltan fight in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan fight in asteroid field");
}

describe("Zoltan fight in asteroid field", () => {
  it("shows the printed intro, and the fight choice starts a Zoltan combat in an asteroid field", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:zoltan-fight-in-asteroid-field:0"));
    choose(g, "c:zoltan-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "zoltan");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "zoltan-fight-in-asteroid-field");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
  });

  it("starts the Zoltan ship in an asteroid field on arrival and leaves no button", () => {
    // The page has no choice. "Fight a Zoltan ship (default rewards)." asteroidfield=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:zoltan-fight-in-asteroid-field";
    dest.name = "Zoltan fight in asteroid field";
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
    assert.equal(g.enemy?.faction, "zoltan");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.asteroid, true);
    assert.equal(g.flare, false);
    assert.equal(g.fightEvent, "zoltan-fight-in-asteroid-field");
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes(BODY));
  });
});

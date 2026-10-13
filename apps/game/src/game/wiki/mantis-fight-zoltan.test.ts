import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, createGame } from "../sim.ts";

const BODY =
  'You pick up the last broadcast from a rupturing Zoltan freighter: "The Mantis, they\'re here, please-" You\'re interrupted by fire off the port bow!';

describe("Mantis fight (Zoltan)", () => {
  it("starts the Mantis ship on arrival and leaves no button", () => {
    // The page has no choice. "Fight a Mantis ship (default rewards)."
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:mantis-fight-zoltan";
    dest.name = "Mantis fight (Zoltan)";
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
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-zoltan");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes(BODY));
  });
});

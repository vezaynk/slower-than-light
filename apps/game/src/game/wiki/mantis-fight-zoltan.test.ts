import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";

const BODY =
  "You pick up the last broadcast from a rupturing Zoltan freighter: \"The Mantis, they're here, please-\" You're interrupted by fire off the port bow!";

describe("Mantis fight (Zoltan)", () => {
  it("starts the Mantis ship from the arrival card", () => {
    // Wiki citations:
    // > "You pick up the last broadcast from a rupturing Zoltan freighter: \"The Mantis, they're here, please-\" You're interrupted by fire off the port bow!" — [[Mantis fight (Zoltan)]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight (Zoltan)]]
    // The arrival card stays up. "Fight a Mantis ship (default rewards)."
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "ZOLTAN_MANTIS";
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
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.log.includes(BODY), false);
    assert.equal(g.event?.choices[0]?.id, "c:mantis-fight-zoltan:0");
    choose(g, "c:mantis-fight-zoltan:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-zoltan");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
  });
});

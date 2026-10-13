import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "This beacon has been placed too close to a super-giant class M star! The ship will gradually overheat until you get out of here... or die. A pirate, apparently oblivious to the danger of the sun, moves in to engage.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight-near-sun";
  b.name = "Pirate fight near sun";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight near sun");
}

describe("Pirate fight near sun", () => {
  it("shows the sun intro, and the fight choice starts a pirate combat", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-near-sun:0"));
    const scrap = g.scrap;
    choose(g, "c:pirate-fight-near-sun:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-near-sun");
    assert.equal(g.scrap, scrap);
  });

  it("starts the Pirate ship beside the star on arrival and leaves no button", () => {
    // The page has no choice. The star warning, then "Fight a Pirate ship." redgiant=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:pirate-fight-near-sun";
    dest.name = "Pirate fight near sun";
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
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.flare, true);
    assert.equal(g.pulsar, false);
    assert.equal(g.fightEvent, "pirate-fight-near-sun");
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes(BODY));
  });
});

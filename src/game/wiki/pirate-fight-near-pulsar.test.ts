import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Sensors go wild as a nearby pulsar is detected. While you are attempting to recalibrate the FTL drive, a pirate sneaks up on your ship, weapons charging. Prepare for a fight!",
  "You arrive to find a pulsar dominating the view screen. You see a small silhouette pass in front of the star. Before you can ponder what it is, warning signals go off. It appears to be a ship in a firing trajectory!",
  "A small research station orbits a nearby pulsar. It appears largely abandoned, but you detect power signatures flaring up as soon as you're in scanning distance. A small combat ship launches from the station. Pirates!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight-near-pulsar";
  b.name = "Pirate fight near pulsar";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight near pulsar");
}

describe("Pirate fight near pulsar", () => {
  it("shows one of the three intros, and the fight choice starts a pirate combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-near-pulsar:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-fight-near-pulsar:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-near-pulsar");
    assert.equal(g.pulsar, true);
    assert.equal(g.scrap, 10);
  });

  it("starts the Pirate ship beside a pulsar on arrival and leaves no button", () => {
    // The page has no choice. One of the three printed intros, then "Fight a Pirate ship." pulsar=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:pirate-fight-near-pulsar";
    dest.name = "Pirate fight near pulsar";
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
    assert.equal(g.pulsar, true);
    assert.equal(g.flare, false);
    assert.equal(g.fightEvent, "pirate-fight-near-pulsar");
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

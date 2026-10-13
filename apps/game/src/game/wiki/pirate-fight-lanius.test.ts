import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `An upgraded pirate ship sits among the remains of a number of Lanius ships. It hails you, "These punks think they can jus' waltz in here into our sector? Obnoxious, right? Well, I'm sure you know the routine, let's do this."`,
  `The pirate ship patrolling this sector has been busy. The debris of several Rebel scouts and at least one civilian ship litter the area. "Welcome, welcome, there's room for one more!" The over-confident pirate hails you as he charges his weapons and moves in to attack.`,
  "A pirate ship appears to be threatening a small refugee ship near the beacon. Upon seeing you jump in, it turns to approach. The civilian wastes no time and jumps away, but that appears only to harden the pirate's resolve.",
  "Debris from a number of battleships are scattered around the beacon. As you approach the area a pirate ship thrusts itself through the hulks to attack. It must be using the metal to lure the Lanius into a trap.",
  "The pirate sees you before you see him... prepare for a fight!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight-lanius";
  b.name = "Pirate fight (Lanius)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight (Lanius)");
}

describe("Pirate fight (Lanius)", () => {
  it("shows one of the five intros, and the fight choice starts a pirate combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-lanius:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-fight-lanius:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-lanius");
    assert.equal(g.scrap, 10);
  });

  it("starts the Pirate ship on arrival and leaves no button", () => {
    // The page has no choice. One of the five printed intros, then "Fight a Pirate ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:pirate-fight-lanius";
    dest.name = "Pirate fight (Lanius)";
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
    assert.equal(g.fightEvent, "pirate-fight-lanius");
    assert.equal(g.flare, false);
    assert.equal(g.asteroid, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

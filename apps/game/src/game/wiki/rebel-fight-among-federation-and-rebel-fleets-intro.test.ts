import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You arrive in the middle of a raging battle. Both sides are taking heavy losses. A small squadron flies past and a fighter breaks off, moving toward your position.",
  "Two fleets fight nearby. You try to skirt around the edges of the battle and keep out of weapons range, but a Rebel scout spots you and moves in.",
  "It's hard to tell who is winning the nearby battle. Before you have a chance to figure it out, a fighter moves in to attack.",
  "The sheer scale of the destruction in the distance is almost breath-taking. Unfortunately, your position as an independent observer doesn't last for long!",
  "The destruction in the distance is almost awe-inspiring. However you're dragged back to reality as Sensors indicate you are under attack.",
  "You don't have any time to worry about the battle in the distance. The fight is coming to you really quickly!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-among-federation-and-rebel-fleets";
  b.name = "Rebel fight among Federation and Rebel fleets";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight among Federation and Rebel fleets");
}

describe("Rebel fight among Federation and Rebel fleets intro", () => {
  it("shows one of the six printed intros, then fights a Rebel ship", () => {
    assert.equal(INTROS.length, 6);
    assert.equal(new Set(INTROS).size, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-among-federation-and-rebel-fleets:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-fight-among-federation-and-rebel-fleets:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-among-federation-and-rebel-fleets");
    assert.equal(g.scrap, 10);
  });

  it("starts the Rebel ship on arrival and leaves no button", () => {
    // The page has no choice. One of the six printed intros, then "Fight a Rebel ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rebel-fight-among-federation-and-rebel-fleets";
    dest.name = "Rebel fight among Federation and Rebel fleets";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.sectorName = "The Last Stand";
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-among-federation-and-rebel-fleets");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

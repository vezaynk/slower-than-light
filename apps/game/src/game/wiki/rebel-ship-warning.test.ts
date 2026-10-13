import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-warning";
  b.name = "Rebel ship warning";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship warning");
}

describe("Rebel ship warning", () => {
  it("prints the scout sentence, and the fight choice starts a Rebel ship", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, "You stumble across a forward scout of the Rebel fleet.");
    assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-warning:0"));
    choose(g, "c:rebel-ship-warning:0");
    assert.ok(g.log.includes("They are powering up their FTL! If they get away, they will no doubt warn the fleet of your position!"));
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-ship-warning");
    assert.equal(g.scrap, 10);
  });

  it("starts the running Rebel ship on arrival and leaves no button", () => {
    // The page has no choice. "Fight a Rebel ship that is running away."
    // The red line doubles pursuit only if the scout gets away.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rebel-ship-warning";
    dest.name = "Rebel ship warning";
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
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-ship-warning");
    assert.equal(g.fleet, 1);
    assert.equal(g.enemyEscape?.mode, "start");
    assert.equal(g.enemyEscape?.seconds, 40);
    assert.equal(g.enemyEscape?.running, true);
    assert.equal(g.enemyEscape?.pursuit, true);
    assert.ok(g.log.includes("You stumble across a forward scout of the Rebel fleet."));
    assert.ok(g.log.includes("They are powering up their FTL! If they get away, they will no doubt warn the fleet of your position!"));
  });
});

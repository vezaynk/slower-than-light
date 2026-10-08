import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-fight-in-asteroid-field";
  b.name = "Auto-ship fight in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Auto-ship fight in asteroid field");
}

describe("Auto-ship fight in asteroid field", () => {
  it("starts the fight inside an asteroid field", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-fight-in-asteroid-field:0"), true);
    choose(g, "c:auto-ship-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-fight-in-asteroid-field");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.asteroid, true);
  });

  it("starts the Auto-ship in an asteroid field on arrival and leaves no button", () => {
    // The page has no choice. "Fight an Auto-ship." asteroidfield=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:auto-ship-fight-in-asteroid-field";
    dest.name = "Auto-ship fight in asteroid field";
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
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.asteroid, true);
    assert.equal(g.fightEvent, "auto-ship-fight-in-asteroid-field");
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes("You arrive in an asteroid belt to discover that a Rebel automated-scout has been stationed here. Prepare for a fight!"));
  });
});

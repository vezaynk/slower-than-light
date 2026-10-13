import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "As a naturally warlike species with few inter-galactic diplomatic ties, the Rock people have garnered quite a reputation as fearsome pirates. You stumble across one of their ships and they promptly live up to type.",
  "A Rock ship flies past your windows and you recognize outcast decorations on the hull. These must be pirates!",
  "A motley collection of Rock ships are stationed around this beacon - they look to have resorted to a pirate's life. Defensive maneuvers!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-pirates-fight";
  b.name = "Rock pirates fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock pirates fight");
}

describe("Rock pirates fight", () => {
  it("shows one of the three intros, and the fight choice starts a Rock pirate combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rock-pirates-fight:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rock-pirates-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "rock-pirates-fight");
    assert.equal(g.scrap, 10);
  });

  it("starts the Rock pirate ship on arrival and leaves no button", () => {
    // The page has no choice. One of the three printed intros, then "Fight a Rock pirate ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rock-pirates-fight";
    dest.name = "Rock pirates fight";
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
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "rock-pirates-fight");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

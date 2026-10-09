import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Minute fissures in the shields spark and crackle as the ship jumps into the wake of a huge asteroid. More asteroids follow, as does a lost and aggressive Rock pirate ship.",
  "You exit the jump surrounded by dirt and rocks. Before long a blast is deflected by your shield, but that was no asteroid... Incoming pirate!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-pirates-fight-in-asteroid-field";
  b.name = "Rock pirates fight in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock pirates fight in asteroid field");
}

describe("Rock pirates fight in asteroid field", () => {
  it("shows one of the two intros, and the fight starts inside an asteroid field", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rock-pirates-fight-in-asteroid-field:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rock-pirates-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "rock-pirates-fight-in-asteroid-field");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
  });

  it("starts the Rock pirate ship inside an asteroid field on arrival and leaves no button", () => {
    // The page has no choice. One of the two printed intros, then "Fight a Rock pirate ship." asteroidfield=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rock-pirates-fight-in-asteroid-field";
    dest.name = "Rock pirates fight in asteroid field";
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
    assert.equal(g.asteroid, true);
    assert.equal(g.flare, false);
    assert.equal(g.fightEvent, "rock-pirates-fight-in-asteroid-field");
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

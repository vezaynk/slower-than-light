import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `A Rebel captain appears on the screen. "I thought we had been doomed to backwater assignments. This is my chance to get back in Command's good graces! Charge the weapons!"`,
  "A small rebel research station overlooks a pulsating star. Before you can react a Rebel ship spots you and moves in to attack.",
  "You arrive at an infrequently used beacon close to a pulsar. Before long a Rebel ship happens to jump nearby. Looks like you'll have to fight.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-near-pulsar";
  b.name = "Rebel fight near pulsar";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight near pulsar");
}

describe("Rebel fight near pulsar", () => {
  it("shows one of the three intros, and the fight choice starts a Rebel ship combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-near-pulsar:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-fight-near-pulsar:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-near-pulsar");
    assert.equal(g.pulsar, true);
    assert.equal(g.scrap, 10);
  });

  it("starts the Rebel ship beside a pulsar on arrival and leaves no button", () => {
    // The page has no choice. One of the three printed intros, then "Fight a Rebel ship." pulsar=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rebel-fight-near-pulsar";
    dest.name = "Rebel fight near pulsar";
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
    assert.equal(g.pulsar, true);
    assert.equal(g.flare, false);
    assert.equal(g.fightEvent, "rebel-fight-near-pulsar");
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

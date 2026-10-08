import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame, sparePower, syncIonStorm } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { citedFleetAdvance, ionStormBeacon } from "./cited-sectors.ts";

const INTROS = [
  "The ion storm here threatens to deactivate your core systems, a fact made all the worse for the largely unaffected Slug ships circling like space-vultures.",
  "The Slug ship that descends into view as you enter the ion storm must have sensed your distress - defensive action!",
  "You arrive in the middle of an ion storm. Slugs generally avoid these storms but you find one waiting in ambush. Prepare for a fight!",
  "You find yourself stuck in the middle of an ion storm with a Slug ship just a short distance away, refusing all hails. You cautiously try to slip further into the clouds, but they turn suddenly to attack!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.kind = "event";
  b.flag = "cited:slug-fight-in-plasma-storm";
  b.name = "Slug fight in plasma storm";
  b.col = 6;
  g.here = b.id;
  g.fleet = 1;
  g.sectorName = "Slug Controlled Nebula";
  g.event = citedEvent(g, b);
  g.phase = "event";
  return b;
}

describe("Slug fight in plasma storm", () => {
  it("shows one of the four printed intros, then storms a non-nebula beacon", () => {
    assert.equal(INTROS.length, 4);
    assert.equal(new Set(INTROS).size, 4);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:slug-fight-in-plasma-storm:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(3);
    const beacon = open(g);
    assert.equal(ionStormBeacon(beacon, g.fleet), true);
    assert.equal(citedFleetAdvance(g, beacon), 1);
    assert.equal(citedFleetAdvance(g, { kind: "nebula" }), 0.8);
    g.player.reactor = 5;
    for (const id of ["shields", "engines", "oxygen", "medbay", "weapons"] as const) g.player.systems[id].power = 0;
    g.player.systems.weapons.power = 5;
    syncIonStorm(g);
    assert.equal(g.player.storm, true);
    assert.equal(g.player.systems.weapons.power, 3);
    assert.equal(sparePower(g.player), 0);
    choose(g, "c:slug-fight-in-plasma-storm:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "slug-fight-in-plasma-storm");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.enemy?.storm, true);
    assert.equal(beacon.kind, "event");
  });
});

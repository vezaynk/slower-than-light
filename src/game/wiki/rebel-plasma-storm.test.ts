import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, sparePower, startCombat, syncIonStorm } from "../sim.ts";
import { citedFleetAdvance, ionStormBeacon } from "./cited-sectors.ts";

describe("Rebel fight in plasma storm", () => {
  it("storms a non-nebula beacon and keeps the full fleet step", () => {
    const g = createGame(4);
    const beacon = g.beacons.find((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss");
    assert.ok(beacon);
    beacon.kind = "event";
    beacon.flag = "cited:rebel-fight-in-plasma-storm";
    beacon.name = "Rebel fight in plasma storm";
    beacon.col = 5;
    g.here = beacon.id;
    g.fleet = 1;
    g.sectorName = "Slug Home Nebula";
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
    assert.equal(
      g.log[0],
      "This section of the nebula is experiencing a plasma storm. Your main reactor can only function at half capacity.",
    );

    const guns = g.player.weapons.length;
    startCombat(g, "Rebel ship", false, "rebel-fight-in-plasma-storm");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "rebel-fight-in-plasma-storm");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.storm, true);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(beacon.kind, "event");
  });

  it("does not storm a plain event beacon or an exit", () => {
    const g = createGame(5);
    const beacon = g.beacons.find((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss");
    assert.ok(beacon);
    beacon.kind = "event";
    beacon.flag = "";
    beacon.name = "Lane";
    beacon.col = 0;
    g.fleet = 4;
    assert.equal(ionStormBeacon(beacon, g.fleet), false);
    beacon.kind = "exit";
    beacon.flag = "cited:rebel-fight-in-plasma-storm";
    beacon.name = "Rebel fight in plasma storm";
    assert.equal(ionStormBeacon(beacon, g.fleet), false);
  });
});

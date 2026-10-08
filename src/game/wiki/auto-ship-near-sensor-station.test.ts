import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-near-sensor-station";
  b.name = "Auto-ship near sensor station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship near sensor station");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Auto-ship near sensor station", () => {
  it("attacking starts an Auto-ship fight", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-near-sensor-station:2"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-near-sensor-station:3"), true);
    choose(g, "c:auto-ship-near-sensor-station:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-near-sensor-station");
    assert.equal(g.scrap, 10);
  });

  it("a destroyed ship pays low scrap only, and a crew kill does not", () => {
    const destroyed = createGame(1);
    open(destroyed);
    assert.equal(pageWin(destroyed, "auto-ship-near-sensor-station", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /map has been updated/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 0, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.player.weapons.length, createGame(1).player.weapons.length);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-near-sensor-station", true), false);
    assert.equal(killed.scrap, 10);
  });

  it("level 3 sensors start the fight or update the map, and stay shut below that", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-sensor-station:2"), "Needs level 3 Sensors");
    choose(bare, "c:auto-ship-near-sensor-station:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    let fight = false;
    let map = false;
    for (let seed = 1; seed <= 40 && (!fight || !map); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.systems.sensors.level = 3;
      assert.equal(choiceDisabled(g, "c:auto-ship-near-sensor-station:2"), null);
      choose(g, "c:auto-ship-near-sensor-station:2");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.fightEvent, "auto-ship-near-sensor-station");
        assert.equal(g.scrap, 10);
      } else {
        map = true;
        assert.match(g.event?.body ?? "", /local map data/);
        assert.equal(g.event?.body?.includes("Scrap:"), false);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(fight && map, true);
  });

  it("a teleporter downloads the map data, and the button stays shut without one", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-sensor-station:3"), "Needs a Teleporter");
    choose(bare, "c:auto-ship-near-sensor-station:3");
    assert.equal(bare.scrap, 10);

    const g = createGame(2);
    open(g);
    g.player.kits.sling = { id: "sling", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    assert.equal(choiceDisabled(g, "c:auto-ship-near-sensor-station:3"), null);
    const guns = g.player.weapons.length;
    choose(g, "c:auto-ship-near-sensor-station:3");
    assert.match(g.event?.body ?? "", /long-range scanner/);
    assert.equal(g.event?.body?.includes("Scrap:"), false);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.phase, "event");
  });

  it("avoiding the ship spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-near-sensor-station:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
  });
});

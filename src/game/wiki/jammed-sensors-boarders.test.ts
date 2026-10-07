import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sensorLevel } from "../extras/sensors.ts";
import { choiceDisabled, choose, commitJump, createGame } from "../sim.ts";
import { playerSensorsOff } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const CONTINUE = "c:boarders-humans-jammed-sensors:0";
const HACK = "c:boarders-humans-jammed-sensors:1";
const DEST = "Boarders: Humans jammed sensors";
const SECTORS = ["Pirate Controlled Sector", "Zoltan Controlled Sector", "Zoltan Homeworlds"];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: DEST,
    tier: "",
    flag: "cited:boarders-humans-jammed-sensors",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "plain" && c.aboard === "player");
}

function fitHacking(g: Game) {
  g.player.kits.spike = { id: "spike", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

describe("Boarders: Humans jammed sensors", () => {
  it("disables sensors for 3-5 humans until the jump, and hacking only counters the jam", () => {
    for (const sector of SECTORS) {
      const pages = citedPagesFor(sector).filter((e) => e.dest === DEST);
      assert.equal(pages.length, 1, sector);
      assert.deepEqual([...pages[0].sectors], SECTORS);
    }
    const ev = citedEvent(createGame(1), beacon());
    assert.ok(ev);
    assert.ok(ev.body.length <= 240);
    assert.deepEqual(ev.choices.map((c) => c.id), [CONTINUE, HACK]);

    const bare = createGame(2);
    assert.equal(choiceDisabled(bare, HACK), "Needs a Hacking system");
    choose(bare, HACK);
    assert.equal(boarded(bare).length, 0);
    assert.equal(playerSensorsOff(bare), false);

    const seen = new Set<number>();
    for (let seed = 1; seed <= 80 && !(seen.has(3) && seen.has(5)); seed++) {
      const g = createGame(seed);
      const level = g.player.systems.sensors.level;
      const kills = g.kills;
      choose(g, CONTINUE);
      const humans = boarded(g);
      assert.ok(humans.length >= 3 && humans.length <= 5, String(humans.length));
      seen.add(humans.length);
      assert.equal(playerSensorsOff(g), true);
      assert.equal(sensorLevel(g, g.player, "player"), 0);
      assert.equal(g.player.systems.sensors.level, level);
      assert.equal(g.enemy, null);
      assert.equal(g.kills, kills);
      const here = g.beacons.find((b) => b.id === g.here);
      assert.ok(here?.links[0]);
      g.phase = "map";
      g.fuel = 3;
      commitJump(g, here!.links[0]);
      assert.equal(playerSensorsOff(g), false);
      assert.ok(sensorLevel(g, g.player, "player") > 0);
    }
    assert.ok(seen.has(3) && seen.has(5), [...seen].sort().join(","));

    const hacked = createGame(4);
    fitHacking(hacked);
    shutThenCounter(hacked);
  });
});

function shutThenCounter(g: Game) {
  const level = g.player.kits.spike?.level;
  choose(g, CONTINUE);
  assert.equal(playerSensorsOff(g), true);
  g.crew = g.crew.filter((c) => c.side === "player");
  assert.equal(choiceDisabled(g, HACK), null);
  choose(g, HACK);
  const humans = boarded(g);
  assert.ok(humans.length >= 3 && humans.length <= 5);
  assert.equal(playerSensorsOff(g), false);
  assert.equal(g.player.kits.spike?.level, level);
  assert.equal(sensorLevel(g, g.player, "player") > 0, true);
}

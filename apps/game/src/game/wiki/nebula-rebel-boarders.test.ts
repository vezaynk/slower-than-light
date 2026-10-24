import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-rebels-in-nebula:0";
const DEST = "Boarders: rebels in nebula";
const SECTORS = [
  "CIVILIAN_SECTOR",
  "PIRATE_SECTOR",
  "REBEL_SECTOR",
  "REBEL_SECTOR_MINIBOSS",
  "NEBULA_SECTOR",
  "ZOLTAN_SECTOR",
  "ZOLTAN_HOME",
];

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
    flag: "NEBULA_REBEL_BOARDING",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "human" && c.aboard === "player");
}

describe("Boarders: rebels in nebula", () => {
  it("is one card in each named sector and beams 3-4 humans with no ship", () => {
    // Wiki citations:
    // > "There appear to be a number of small stations nearby. Before you have time to scan them, warnings go off. A Rebel teleporter was used in one of the stations. You've been boarded!" — [[Boarders: rebels in nebula]]
    // > "3-4 human boarders beam aboard your ship." — [[Boarders: rebels in nebula]]
    for (const sector of SECTORS) {
      const pages = citedPagesFor(sector).filter((e) => e.dest === DEST);
      assert.equal(pages.length, 1, sector);
      assert.deepEqual([...pages[0].sectors], SECTORS);
    }
    const ev = citedEvent(createGame(1), beacon());
    assert.ok(ev);
    assert.ok(ev.body.length <= 240);
    assert.equal(ev.choices.length, 1);
    assert.equal(ev.choices[0]?.id, ID);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 80 && !(seen.has(3) && seen.has(4)); seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const kills = g.kills;
      const before = g.crew.length;
      choose(g, ID);
      const humans = boarded(g);
      assert.ok(humans.length >= 3 && humans.length <= 4, String(humans.length));
      seen.add(humans.length);
      assert.equal(g.crew.length, before + humans.length);
      assert.equal(g.enemy, null);
      assert.equal(g.phase, "combat");
      assert.equal(g.flare, false);
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
    }
    assert.ok(seen.has(3) && seen.has(4), [...seen].sort().join(","));
  });

  it("shows the boarding card on arrival, then the button beams the rebels", () => {
    // The boarding sentence stays on the card. The button beams 3-4 humans.
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "NEBULA_REBEL_BOARDING";
    dest.name = DEST;
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    const intro =
      "There appear to be a number of small stations nearby. Before you have time to scan them, warnings go off. A Rebel teleporter was used in one of the stations. You've been boarded!";
    commitJump(g, dest.id);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, intro);
    assert.equal(g.log.includes(intro), false);
    assert.equal(g.event?.choices[0]?.id, ID);
    choose(g, ID);
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    assert.equal(g.flare, false);
    const humans = boarded(g);
    assert.ok(humans.length >= 3 && humans.length <= 4, String(humans.length));
    assert.ok(g.log.some((line) => line.includes("human boarders beam aboard your ship.")));
    assert.equal(g.log.includes(intro), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-mantis:0";
const DEST = "Boarders: Mantis";
const SECTORS = ["Mantis Controlled Sector", "Mantis Homeworlds"];

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
    flag: "cited:boarders-mantis",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "blade" && c.aboard === "player");
}

describe("Boarders: Mantis", () => {
  it("is one card in each named sector and beams 2-4 mantis with no ship", () => {
    for (const sector of SECTORS) {
      const pages = citedPagesFor(sector).filter((e) => e.dest === DEST);
      assert.equal(pages.length, 1, sector);
      assert.deepEqual([...pages[0].sectors], SECTORS);
    }
    const ev = citedEvent(createGame(1), beacon());
    assert.ok(ev);
    assert.equal(ev.choices[0]?.id, ID);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 80 && !(seen.has(2) && seen.has(4)); seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const kills = g.kills;
      const before = g.crew.length;
      choose(g, ID);
      const mantis = boarded(g);
      assert.ok(mantis.length >= 2 && mantis.length <= 4, String(mantis.length));
      seen.add(mantis.length);
      assert.equal(g.crew.length, before + mantis.length);
      assert.equal(g.enemy, null);
      assert.equal(g.phase, "combat");
      assert.equal(g.flare, false);
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
    }
    assert.ok(seen.has(2) && seen.has(4), [...seen].sort().join(","));
  });

  it("applies the red line on arrival and leaves no button", () => {
    // The page has no choice. "2-4 mantis boarders beam aboard your ship."
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:boarders-mantis";
    dest.name = DEST;
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
    assert.equal(g.enemy, null);
    const mantis = boarded(g);
    assert.ok(mantis.length >= 2 && mantis.length <= 4, String(mantis.length));
    assert.ok(mantis.every((c) => c.name === "Mantis"));
    assert.ok(g.log.some((line) => line.includes("mantis boarders beam aboard your ship.")));
  });
});

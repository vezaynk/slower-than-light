import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-rockmen-near-sun:0";
const DEST = "Boarders: Rockmen near sun";
const INTROS = [
  'As soon as you arrive you hear the telltale sounds of a teleporter and shouts reverberating through the ship, "Prepare to burn, fleshy meat-sack aliens!"',
  "With their high resistance to heat, outlaw Rocks often settle very close to stars. That is why it is hardly surprising when your ship gets boarded as you stumble past a hidden settlement.",
];
const SECTORS = ["ROCK_SECTOR", "ROCK_HOME"];

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
    flag: "ROCK_BOARDERS_SUN",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "rock" && c.aboard === "player");
}

describe("Boarders: Rockmen near sun", () => {
  it("is one card in each named sector and beams 2-3 rocks under a red giant", () => {
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Boarders: Rockmen near sun]]
    // > "2-3 rock boarders beam aboard your ship." — [[Boarders: Rockmen near sun]]
    for (const sector of SECTORS) {
      const pages = citedPagesFor(sector).filter((e) => e.dest === DEST);
      assert.equal(pages.length, 1, sector);
      assert.deepEqual([...pages[0].sectors], SECTORS);
    }
    const ev = citedEvent(createGame(1), beacon());
    assert.ok(ev);
    assert.equal(ev.choices[0]?.id, ID);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 80 && !(seen.has(2) && seen.has(3)); seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const kills = g.kills;
      const before = g.crew.length;
      choose(g, ID);
      const rocks = boarded(g);
      assert.ok(rocks.length >= 2 && rocks.length <= 3, String(rocks.length));
      seen.add(rocks.length);
      assert.equal(g.crew.length, before + rocks.length);
      assert.equal(g.enemy, null);
      assert.equal(g.phase, "combat");
      assert.equal(g.flare, true);
      assert.ok((g.flareWait ?? 0) >= 28 && (g.flareWait ?? 0) < 34);
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
    }
    assert.ok(seen.has(2) && seen.has(3), [...seen].sort().join(","));
  });

  it("shows the intro card on arrival, then applies the red line", () => {
    // Wiki citations:
    // > "2-3 rock boarders beam aboard your ship." — [[Boarders: Rockmen near sun]]
    // The page has no choice. "2-3 rock boarders beam aboard your ship." redgiant=true.
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "ROCK_BOARDERS_SUN";
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
    const intro = g.event?.body ?? "";
    assert.equal(g.phase, "event");
    assert.ok(INTROS.includes(intro), intro);
    assert.equal(g.log.includes(intro), false);
    assert.equal(g.event?.choices[0]?.id, ID);
    choose(g, ID);
    assert.equal(g.phase, "combat");
    assert.equal(g.event, null);
    assert.equal(g.enemy, null);
    assert.equal(g.flare, true);
    assert.ok((g.flareWait ?? 0) >= 28 && (g.flareWait ?? 0) < 34);
    const rocks = boarded(g);
    assert.ok(rocks.length >= 2 && rocks.length <= 3, String(rocks.length));
    assert.ok(g.log.some((line) => line.includes("rock boarders beam aboard your ship.")));
    assert.equal(g.log.includes(intro), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-humans-near-sun:0";
const BODY =
  "You arrive to find yourself extremely close to a star. You receive a message from a pirate ship, \"I'm glad you arrived; our ship is damaged and we were getting desperate... I hope you don't mind if we take yours.\" Hostiles detected on board our ship!";
const DEST = "Boarders: Humans near sun";
const SECTORS = [
  "MANTIS_SECTOR",
  "MANTIS_HOME",
  "PIRATE_SECTOR",
  "REBEL_SECTOR",
  "REBEL_SECTOR_MINIBOSS",
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
    flag: "BOARDERS_SUN",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "human" && c.aboard === "player");
}

describe("Boarders: Humans near sun", () => {
  it("is one card in each named sector and beams 2-4 humans under a red giant", () => {
    // Wiki citations:
    // > "This random event occurs in Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold." — [[Boarders: Humans near sun]]
    // > "2-4 human boarders beam aboard your ship." — [[Boarders: Humans near sun]]
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
      const humans = boarded(g);
      assert.ok(humans.length >= 2 && humans.length <= 4, String(humans.length));
      seen.add(humans.length);
      assert.equal(g.crew.length, before + humans.length);
      assert.equal(g.enemy, null);
      assert.equal(g.phase, "combat");
      assert.equal(g.flare, true);
      assert.ok((g.flareWait ?? 0) >= 28 && (g.flareWait ?? 0) < 34);
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
      assert.equal(g.augments.includes("O2_MASKS"), false);
    }
    assert.ok(seen.has(2) && seen.has(4), [...seen].sort().join(","));
  });

  it("shows the star card on arrival, then beams the humans aboard", () => {
    // Wiki citations:
    // > "2-4 human boarders beam aboard your ship." — [[Boarders: Humans near sun]]
    // The arrival card stays up. "2-4 human boarders beam aboard your ship." redgiant=true.
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "BOARDERS_SUN";
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
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.log.includes(BODY), false);
    assert.equal(g.event?.choices[0]?.id, ID);
    choose(g, ID);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    assert.equal(g.flare, true);
    assert.ok((g.flareWait ?? 0) >= 28 && (g.flareWait ?? 0) < 34);
    const humans = boarded(g);
    assert.ok(humans.length >= 2 && humans.length <= 4, String(humans.length));
    assert.ok(g.log.some((line) => line.includes("human boarders beam aboard your ship.")));
  });
});

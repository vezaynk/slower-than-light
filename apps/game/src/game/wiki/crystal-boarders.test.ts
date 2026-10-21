import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const ID = "c:boarders-crystal:0";
const DEST = "Boarders: Crystal";
const INTROS = [
  "You detect a heavily armed Crystalline ship escorting some sort of prison vessel. Scans indicate there are a number of non-Crystal based life forms aboard; they must be rounding up all of the intruders in their space! Before you can react, you hear the telltale sounds of a teleporter going off.",
  "You arrive near a small settlement and a lone guard ship moves to intercept you. You try to contact them but they are refusing all hails. Suddenly you hear lasers ricocheting from within the ship. You've been boarded!",
  `You pick up chatter from a nearby ship, "Yes... Here are some interesting specimens. Try to take them alive this time, there's a lot of money to be had on aliens." Scanners indicate a remote teleporter was just used.`,
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
    flag: "BOARDERS_CRYSTAL",
    asteroid: false,
  };
}

function boarded(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "crystal" && c.aboard === "player");
}

describe("Boarders: Crystal", () => {
  it("is one Hidden Crystal Worlds card and beams 2-3 crystal boarders with no ship", () => {
    // Wiki citations:
    // > "This random event occurs in Hidden Crystal Worlds." — [[Boarders: Crystal]]
    // > "2-3 crystal boarders beam aboard your ship." — [[Boarders: Crystal]]
    const pages = citedPagesFor("CRYSTAL_HOME").filter((e) => e.dest === DEST);
    assert.equal(pages.length, 1);
    assert.deepEqual([...pages[0].sectors], ["CRYSTAL_HOME"]);
    const ev = citedEvent(createGame(1), beacon());
    assert.ok(ev);
    assert.ok(ev.body.length <= 240);
    assert.equal(ev.choices.length, 1);
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
      const crystals = boarded(g);
      assert.ok(crystals.length >= 2 && crystals.length <= 3, String(crystals.length));
      seen.add(crystals.length);
      assert.equal(g.crew.length, before + crystals.length);
      assert.ok(crystals.every((c) => c.name === "Crystal"));
      assert.equal(g.enemy, null);
      assert.equal(g.phase, "combat");
      assert.equal(g.flare, false);
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
    }
    assert.ok(seen.has(2) && seen.has(3), [...seen].sort().join(","));
  });

  it("shows the boarding card, then beams the crystals", () => {
    // Wiki citations:
    // > "2-3 crystal boarders beam aboard your ship." — [[Boarders: Crystal]]
    // The page has no choice. "2-3 crystal boarders beam aboard your ship."
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "BOARDERS_CRYSTAL";
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
    const body = g.event?.body ?? "";
    assert.equal(g.phase, "event");
    assert.ok(INTROS.includes(body), body);
    assert.equal(g.log.includes(body), false);
    assert.equal(g.event?.choices[0]?.id, ID);
    choose(g, ID);
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    assert.equal(g.log.includes(body), false);
    const crystals = boarded(g);
    assert.ok(crystals.length >= 2 && crystals.length <= 3, String(crystals.length));
    assert.ok(crystals.every((c) => c.name === "Crystal"));
  });
});

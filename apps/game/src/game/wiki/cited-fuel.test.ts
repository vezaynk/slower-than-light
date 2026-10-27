import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import { createGame } from "../sim.ts";
import type { Beacon } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";
import { citedFuelCandidates, rollFuelWait } from "./cited-fuel.ts";

function beacon(flag: string, name: string): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name,
    tier: "",
    flag,
    asteroid: false,
  };
}

/**
 * Locations params read from each page. distressboth is in both lists.
 * Order is the seven written pages, then EXTRA_EVENTS. Not a shuffle.
 */
const DISTRESS_ON = [
  // {{Locations|outoffuel=distresson}}
  { flag: "FUEL_ON_REBEL_WARNING", dest: "No fuel: Auto-ship warning" },
  // {{Locations|outoffuel=distresson}}
  { flag: "FUEL_ON_MANTIS_ATTACK", dest: "No fuel: Mantis fight" },
  // {{Locations|outoffuel=distresson}}
  { flag: "FUEL_ON_REBEL_ATTACK", dest: "No fuel: Rebel fight" },
  // {{Locations|outoffuel=distresson}}
  { flag: "FUEL_ON_SLUG_OVERPRICED", dest: "No fuel: Slug fuel depot" },
  // {{Locations|outoffuel=distresson}}
  { flag: "FUEL_SELLER_DISTRESS", dest: "No fuel: automated refueling ship" },
  // {{Locations|outoffuel=distressboth}}
  { flag: "FUEL_EXPLORE", dest: "No fuel: explore the system" },
  // {{Locations|outoffuel=distresson}}
  { flag: "FUEL_ON_SLUG_CHUCKLE", dest: "No fuel: Slug fuel trader" },
  // {{Locations|outoffuel=distresson}}
  { flag: "FUEL_TRADER_DISTRESS", dest: "No fuel: fuel trader (distress on)" },
  // {{Locations|outoffuel=distressboth}}
  { flag: "FUEL_APPROACH", dest: "No fuel: prepare to dock" },
  // {{Locations|outoffuel=distresson}}
  { flag: "NO_FUEL_REFUGEE", dest: "No fuel: refugee trading" },
];

const DISTRESS_OFF = [
  // {{Locations|outoffuel=distressoff}}
  { flag: "FUEL_OFF_ENGI_DUBIOUS", dest: "No fuel: Engi ship repair" },
  // {{Locations|outoffuel=distressboth}}
  { flag: "FUEL_EXPLORE", dest: "No fuel: explore the system" },
  // {{Random Events}} {{Locations|outoffuel=distressoff}}
  { flag: "FUEL_FLEET_DELAY", dest: "No fuel: Rebel fleet delay" },
  // {{Locations|outoffuel=distressoff}}
  { flag: "NO_FUEL_REFUGEE_FRIENDLY", dest: "No fuel: friendly refugee" },
  // {{Locations|outoffuel=distressoff}}
  { flag: "FUEL_OFF_ROCK_WRECK", dest: "No fuel: drifting debris" },
  // {{Locations|outoffuel=distressoff}}
  { flag: "FUEL_TRADER", dest: "No fuel: fuel trader (distress off)" },
  // {{Locations|outoffuel=distressboth}}
  { flag: "FUEL_APPROACH", dest: "No fuel: prepare to dock" },
];

const SKIPPED = ["No fuel: wait fail (distress off)", "No fuel: wait fail (distress on)"];

describe("cited fuel candidates", () => {
  it("lists every distress-on match and does not pick a winner", () => {
    assert.deepEqual(citedFuelCandidates(true), DISTRESS_ON);
    assert.deepEqual(citedFuelCandidates(true), citedFuelCandidates(true));
    assert.ok(DISTRESS_ON.length > 1);
  });

  it("lists every distress-off match, including distressboth, and does not pick a winner", () => {
    assert.deepEqual(citedFuelCandidates(false), DISTRESS_OFF);
    assert.deepEqual(citedFuelCandidates(false), citedFuelCandidates(false));
    assert.ok(DISTRESS_OFF.length > 1);
    const both = DISTRESS_ON.filter((row) => DISTRESS_OFF.some((other) => other.flag === row.flag));
    assert.deepEqual(
      both.map((row) => row.dest),
      ["No fuel: explore the system", "No fuel: prepare to dock"],
    );
  });

  it("resolves a flagged out-of-fuel page and does not place one that names no sector", () => {
    const g = createGame(1, "PLAYER_SHIP_HARD", "normal");
    const seen = new Set<string>();
    for (const row of [...DISTRESS_ON, ...DISTRESS_OFF]) {
      if (seen.has(row.flag)) continue;
      seen.add(row.flag);
      const ev = citedEvent(g, beacon(row.flag, row.dest));
      assert.equal(ev?.title, row.dest);
      if ((eventDef(row.flag)?.sectors.length ?? 0) === 0)
        assert.equal(
          g.beacons.some((b) => b.flag === row.flag),
          false,
        );
    }
  });

  it("does not candidate a skipped page", () => {
    const dests = [...citedFuelCandidates(true), ...citedFuelCandidates(false)].map(
      (row) => row.dest,
    );
    for (const title of SKIPPED) assert.equal(dests.includes(title), false);
  });
});

describe("waiting with no fuel (per the user: distress beacon toggle)", () => {
  it("plays the wait fail at its printed share and otherwise a page for the distress side", () => {
    // Wiki citations:
    // > "This event has a 36.4% chance of occurring when you wait at a beacon with your distress beacon off." — [[No fuel: wait fail (distress off)#Trivia]]
    // > "This event has a 16.7% chance of occurring when you wait at a beacon with your distress beacon on." — [[No fuel: wait fail (distress on)#Trivia]]
    let seed = 1;
    const roll = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (const on of [true, false]) {
      let fails = 0;
      const allowed = new Map(citedFuelCandidates(on).map((c) => [c.flag, c.dest]));
      for (let i = 0; i < 4000; i++) {
        const pick = rollFuelWait(roll, on);
        if ("fail" in pick) fails += 1;
        else assert.equal(allowed.get(pick.flag), pick.dest, pick.flag);
      }
      const share = fails / 4000;
      // No fuel: wait fail, Trivia: 16.7% with the beacon on, 36.4% with it off.
      assert.ok(Math.abs(share - (on ? 0.167 : 0.364)) < 0.03, String(share));
    }
  });

  it("still draws a page when the archive stored the event id as its title", () => {
    const flags = new Set([...DISTRESS_ON, ...DISTRESS_OFF].map((row) => row.flag));
    const events = [...flags].map((id) => {
      const row = eventDef(id);
      assert.ok(row, id);
      return { ...row, dest: row.id, aliases: [] };
    });
    loadPack({ events }, "append");
    try {
      assert.deepEqual(citedFuelCandidates(true), DISTRESS_ON);
      assert.deepEqual(citedFuelCandidates(false), DISTRESS_OFF);
      const delay = rollFuelWait(() => 0.37, false);
      assert.deepEqual(delay, {
        flag: "FUEL_FLEET_DELAY",
        dest: "No fuel: Rebel fleet delay",
      });
      const page = rollFuelWait(() => 0.5, true);
      assert.equal("fail" in page, false);
      if (!("fail" in page)) assert.match(page.dest, /^No fuel: /);
    } finally {
      resetPackForTests();
    }
  });
});

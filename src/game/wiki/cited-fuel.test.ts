import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Beacon } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { EXTRA_EVENTS, citedFuelCandidates } from "./cited-fuel.ts";

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
  { flag: "cited:no-fuel-auto-ship-warning", dest: "No fuel: Auto-ship warning" },
  // {{Locations|outoffuel=distresson}}
  { flag: "cited:no-fuel-mantis-fight", dest: "No fuel: Mantis fight" },
  // {{Locations|outoffuel=distresson}}
  { flag: "cited:no-fuel-rebel-fight", dest: "No fuel: Rebel fight" },
  // {{Locations|outoffuel=distresson}}
  { flag: "cited:no-fuel-slug-fuel-depot", dest: "No fuel: Slug fuel depot" },
  // {{Locations|outoffuel=distresson}}
  { flag: "cited:no-fuel-automated-refueling-ship", dest: "No fuel: automated refueling ship" },
  // {{Locations|outoffuel=distressboth}}
  { flag: "cited:no-fuel-explore-the-system", dest: "No fuel: explore the system" },
];

const DISTRESS_OFF = [
  // {{Locations|outoffuel=distressoff}}
  { flag: "cited:no-fuel-engi-ship-repair", dest: "No fuel: Engi ship repair" },
  // {{Locations|outoffuel=distressboth}}
  { flag: "cited:no-fuel-explore-the-system", dest: "No fuel: explore the system" },
  // {{Random Events}} {{Locations|outoffuel=distressoff}}
  { flag: "cited:no-fuel-rebel-fleet-delay", dest: "No fuel: Rebel fleet delay" },
  // {{Locations|outoffuel=distressoff}}
  { flag: "cited:no-fuel-friendly-refugee", dest: "No fuel: friendly refugee" },
];

const SKIPPED = [
  "No fuel: Slug fuel trader",
  "No fuel: drifting debris",
  "No fuel: fuel trader (distress off)",
  "No fuel: fuel trader (distress on)",
  "No fuel: prepare to dock",
  "No fuel: refugee trading",
  "No fuel: wait fail (distress off)",
  "No fuel: wait fail (distress on)",
];

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
    assert.deepEqual(both.map((row) => row.dest), ["No fuel: explore the system"]);
  });

  it("resolves a flagged out-of-fuel page and does not place one that names no sector", () => {
    const g = createGame(1, "kestrel-a", "normal");
    const extra = new Set(EXTRA_EVENTS.map((ev) => ev.flag));
    const seen = new Set<string>();
    for (const row of [...DISTRESS_ON, ...DISTRESS_OFF]) {
      if (seen.has(row.flag)) continue;
      seen.add(row.flag);
      const ev = citedEvent(g, beacon(row.flag, row.dest));
      assert.equal(ev?.title, row.dest);
      if (extra.has(row.flag)) assert.equal(g.beacons.some((b) => b.flag === row.flag), false);
    }
  });

  it("does not candidate a skipped page and does not invent a sector", () => {
    const dests = [...citedFuelCandidates(true), ...citedFuelCandidates(false)].map((row) => row.dest);
    for (const title of SKIPPED) assert.equal(dests.includes(title), false);
    assert.deepEqual(
      EXTRA_EVENTS.map((ev) => ev.dest),
      ["No fuel: Rebel fleet delay", "No fuel: friendly refugee"],
    );
    for (const ev of EXTRA_EVENTS) {
      assert.deepEqual(ev.sectors, []);
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      assert.ok(ev.choices.length >= 1);
    }
  });

  it("quotes the Rebel fleet delay as one jump, then another event", () => {
    const ev = EXTRA_EVENTS.find((row) => row.dest === "No fuel: Rebel fleet delay");
    assert.ok(ev);
    assert.equal(ev.body, "");
    assert.equal(ev.choices.length, 1);
    // "Rebel Fleet pursuit is delayed for 1 jump."
    assert.deepEqual(ev.choices[0].fx[0], { k: "fleet", n: 1 });
    // "Another out of fuel event occurs."
    assert.deepEqual(ev.choices[0].fx[1], { k: "note", text: "Another out of fuel event occurs." });
    assert.equal(ev.choices[0].fx.length, 2);
  });

  it("quotes the friendly refugee as medium fuel only, 2-4", () => {
    const ev = EXTRA_EVENTS.find((row) => row.dest === "No fuel: friendly refugee");
    assert.ok(ev);
    assert.equal(
      ev.body,
      "While it doesn't have much fuel to spare, it recognizes you are part of the Federation and offers to split its remaining fuel with you.",
    );
    assert.ok(ev.body.length <= 240);
    // "You receive {{tooltip|medium|2-4}} [[Rewards#Fuel only|fuel]]."
    assert.deepEqual(ev.choices[0].fx, [{ k: "res", id: "fuel", sign: 1, lo: 2, hi: 4 }]);
  });
});

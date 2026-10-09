import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CREW_CAP, choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";
import { citedAsb, citedFleetAdvance } from "./cited-sectors.ts";
import { joinCrew } from "./surrender.ts";

const WORDS: Record<string, number> = { five: 5, six: 6, seven: 7, eleven: 11 };

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: true,
    resolved: false,
    name: "Slug moons question",
    tier: "",
    flag: "cited:slug-moons-question",
    asteroid: false,
  };
}

function open(seed: number): Game {
  const g = createGame(seed);
  g.sectorName = "Slug Controlled Nebula";
  const b = beacon();
  g.beacons = [b];
  g.here = b.id;
  const ev = citedEvent(g, b);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  g.paused = true;
  return g;
}

function moons(body: string): number {
  const found = body.match(/one of the (five|six|seven|eleven) moons/);
  assert.ok(found, body);
  return WORDS[found[1]!]!;
}

describe("Slug moons question", () => {
  it("is placed in the two slug sectors", () => {
    assert.ok(citedPagesFor("Slug Controlled Nebula").some((ev) => ev.dest === "Slug moons question"));
    assert.ok(citedPagesFor("Slug Home Nebula").some((ev) => ev.dest === "Slug moons question"));
    assert.equal(citedPagesFor("Civilian Sector").some((ev) => ev.dest === "Slug moons question"), false);
  });

  it("stays a regular beacon until arrival, then the nebula environment is on", () => {
    const g = createGame(4);
    g.sectorName = "Slug Home Nebula";
    const b = beacon();
    g.beacons = [b];
    g.here = b.id;
    g.fleet = 5;
    assert.equal(b.kind, "event");
    assert.ok(citedEvent(g, b));
    assert.equal(b.kind, "nebula");
    assert.equal(citedFleetAdvance(g, b), 0.8);
    assert.equal(citedAsb(g, b), false);
  });

  it("shows each of the four printed moon counts", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const found = open(seed).event?.body.match(/one of the (five|six|seven|eleven) moons/);
      assert.ok(found);
      seen.add(found[1]!);
    }
    assert.deepEqual([...seen].sort(), ["eleven", "five", "seven", "six"]);
  });

  it("adds a Slug when the answer matches the tracking sentence", () => {
    const g = open(2);
    const before = g.crew.filter((c) => c.side === "player").length;
    const gels = g.crew.filter((c) => c.kin === "gel").length;
    const scrap = g.scrap;
    const n = moons(g.event?.body ?? "");
    choose(g, g.event?.choices[0]?.id ?? "");
    assert.match(g.event?.body ?? "", /How many moons are there in orbit here/);
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      ["Five.", "Six.", "Seven.", "Eleven."],
    );
    choose(g, `c:slug-moons-question:answer:${n}:${n}`);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before + 1);
    assert.equal(g.crew.filter((c) => c.kin === "gel").length, gels + 1);
    assert.equal(g.scrap, scrap);
    assert.match(g.event?.body ?? "", /That isss\.\.\. correct/);
    assert.match(g.event?.body ?? "", /You receive a Slug crewmember/);
  });

  it("does not add a ninth crewmember", () => {
    const g = open(3);
    while (g.crew.filter((c) => c.side === "player").length < CREW_CAP) assert.equal(joinCrew(g, "Human"), true);
    const n = moons(g.event?.body ?? "");
    choose(g, g.event?.choices[0]?.id ?? "");
    choose(g, `c:slug-moons-question:answer:${n}:${n}`);
    assert.equal(g.crew.filter((c) => c.side === "player").length, CREW_CAP);
    assert.match(g.event?.body ?? "", /There is no room aboard/);
    assert.match(g.event?.body ?? "", /That isss\.\.\. correct/);
  });

  it("a wrong answer loses 35 scrap, 2-4 fuel, and 1-2 drone parts", () => {
    const fuels = new Set<number>();
    const parts = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = open(seed);
      const gels = g.crew.filter((c) => c.kin === "gel").length;
      const n = moons(g.event?.body ?? "");
      const wrong = n === 5 ? 6 : 5;
      g.scrap = 80;
      g.fuel = 10;
      g.player.parts = 10;
      choose(g, g.event?.choices[0]?.id ?? "");
      choose(g, `c:slug-moons-question:answer:${n}:${wrong}`);
      assert.equal(g.scrap, 45);
      const fuel = 10 - g.fuel;
      const spent = 10 - g.player.parts;
      assert.ok(fuel >= 2 && fuel <= 4, String(fuel));
      assert.ok(spent >= 1 && spent <= 2, String(spent));
      fuels.add(fuel);
      parts.add(spent);
      assert.equal(g.crew.filter((c) => c.kin === "gel").length, gels);
      assert.match(g.event?.body ?? "", /That issss\.\.\. incorrect/);
    }
    assert.deepEqual([...fuels].sort((a, b) => a - b), [2, 3, 4]);
    assert.deepEqual([...parts].sort((a, b) => a - b), [1, 2]);
  });

  it("a shortfall spends nothing and leaves the question open", () => {
    const g = open(5);
    const n = moons(g.event?.body ?? "");
    const wrong = n === 11 ? 7 : 11;
    g.scrap = 10;
    g.fuel = 1;
    g.player.parts = 0;
    choose(g, g.event?.choices[0]?.id ?? "");
    choose(g, `c:slug-moons-question:answer:${n}:${wrong}`);
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, 1);
    assert.equal(g.player.parts, 0);
    assert.match(g.event?.body ?? "", /How many moons are there in orbit here/);
  });
});

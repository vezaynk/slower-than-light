import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediumScrapBand } from "../content.ts";
import { CREW_CAP, choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: true,
    resolved: false,
    name: "Zoltan odd moon",
    tier: "",
    flag: "cited:zoltan-odd-moon",
    asteroid: false,
  };
}

function open(seed: number): Game {
  const g = createGame(seed);
  g.sectorName = "Zoltan Controlled Sector";
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

function look(g: Game) {
  choose(g, "c:zoltan-odd-moon:look");
}

function fitBoard(g: Game) {
  g.player.kits.swarm = {
    id: "swarm",
    level: 2,
    power: 0,
    left: 0,
    cool: 0,
    target: "board",
    on: true,
    aux: 0,
    hp: 125,
  };
}

describe("Zoltan odd moon", () => {
  it("is placed in the two Zoltan sectors", () => {
    assert.ok(citedPagesFor("Zoltan Controlled Sector").some((ev) => ev.dest === "Zoltan odd moon"));
    assert.ok(citedPagesFor("Zoltan Homeworlds").some((ev) => ev.dest === "Zoltan odd moon"));
    assert.equal(citedPagesFor("Civilian Sector").some((ev) => ev.dest === "Zoltan odd moon"), false);
  });

  it("opens on the moon and hides the boarding drone", () => {
    const g = open(1);
    assert.match(g.event?.body ?? "", /odd about a moon/);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:zoltan-odd-moon:look", "c:zoltan-odd-moon:leave", "c:zoltan-odd-moon:drone"],
    );
    assert.equal(choiceDisabled(g, "c:zoltan-odd-moon:drone"), "Needs a Boarding Drone");
    fitBoard(g);
    g.player.parts = 0;
    assert.equal(choiceDisabled(g, "c:zoltan-odd-moon:drone"), "Need 1 drone part");
  });

  it("leaves the moon and spends nothing", () => {
    const g = open(2);
    const scrap = g.scrap;
    choose(g, "c:zoltan-odd-moon:leave");
    assert.equal(g.scrap, scrap);
    assert.match(g.event?.body ?? "", /aft scanner/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
  });

  it("check it out reaches the cavern, the low scrap, the medium scrap, and nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const g = open(seed);
      const weapons = g.player.weapons.length;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      look(g);
      const body = g.event?.body ?? "";
      if (body.includes("hidden cavern")) seen.add("cave");
      else if (body.includes("still-functioning weapon")) {
        seen.add("shuttle");
        assert.equal(g.player.weapons.length, weapons);
        const paid = body.match(/Low scrap: (\d+)/);
        assert.ok(paid);
        const n = Number(paid[1]);
        assert.ok(n >= 7 && n <= 10, String(n));
        assert.equal(g.fuel, fuel);
        assert.equal(g.missiles, missiles);
        assert.equal(g.player.parts, parts);
      } else if (body.includes("scrap heap")) {
        seen.add("medium");
        const paid = body.match(/Medium scrap: (\d+)/);
        assert.ok(paid);
        const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
        const n = Number(paid[1]);
        assert.ok(n >= lo && n <= hi, String(n));
        assert.equal(g.fuel, fuel);
        assert.equal(g.missiles, missiles);
        assert.equal(g.player.parts, parts);
      } else if (body.includes("signs of habitation")) {
        seen.add("quiet");
        assert.match(body, /Nothing happens/);
      } else {
        assert.fail(body);
      }
    }
    assert.deepEqual([...seen].sort(), ["cave", "medium", "quiet", "shuttle"]);
  });

  it("keeps the missile when excavation is not worth it, and refuses a dry magazine", () => {
    let spare = false;
    let dry = false;
    for (let seed = 1; seed <= 40 && (!spare || !dry); seed++) {
      const g = open(seed);
      look(g);
      if (!g.event?.body.includes("hidden cavern")) continue;
      if (!spare) {
        const missiles = g.missiles;
        choose(g, "c:zoltan-odd-moon:spare");
        assert.equal(g.missiles, missiles);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        spare = true;
      }
      if (!dry) {
        const again = open(seed);
        look(again);
        if (!again.event?.body.includes("hidden cavern")) continue;
        again.missiles = 0;
        const scrap = again.scrap;
        choose(again, "c:zoltan-odd-moon:boom");
        assert.equal(again.missiles, 0);
        assert.equal(again.scrap, scrap);
        assert.match(again.event?.body ?? "", /hidden cavern/);
        dry = true;
      }
    }
    assert.equal(spare, true);
    assert.equal(dry, true);
  });

  it("spends one missile on a blast that grants no weapon and no unstated scrap", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 120; seed++) {
      const g = open(seed);
      look(g);
      if (!g.event?.body.includes("hidden cavern")) continue;
      const weapons = g.player.weapons.length;
      const scrap = g.scrap;
      g.missiles = 4;
      choose(g, "c:zoltan-odd-moon:boom");
      assert.equal(g.missiles, 3);
      assert.equal(g.player.weapons.length, weapons);
      assert.equal(g.scrap, scrap);
      const body = g.event?.body ?? "";
      if (body.includes("secret base")) seen.add("base");
      else if (body.includes("subterranean base")) seen.add("remains");
      else if (body.includes("What a waste")) seen.add("waste");
      else assert.fail(body);
    }
    assert.deepEqual([...seen].sort(), ["base", "remains", "waste"]);
  });

  it("a boarding drone spends one part and a Zoltan joins", () => {
    const g = open(6);
    fitBoard(g);
    g.player.parts = 3;
    const before = g.crew.filter((c) => c.side === "player").length;
    const sparks = g.crew.filter((c) => c.kin === "spark").length;
    choose(g, "c:zoltan-odd-moon:drone");
    assert.equal(g.player.parts, 2);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before + 1);
    assert.equal(g.crew.filter((c) => c.kin === "spark").length, sparks + 1);
    assert.match(g.event?.body ?? "", /You receive a Zoltan crewmember/);
    assert.match(g.event?.body ?? "", /boarding drone/);
  });

  it("does not add a ninth crewmember", () => {
    const g = open(7);
    fitBoard(g);
    g.player.parts = 2;
    while (g.crew.filter((c) => c.side === "player").length < CREW_CAP) assert.equal(joinCrew(g, "Human"), true);
    choose(g, "c:zoltan-odd-moon:drone");
    assert.equal(g.player.parts, 1);
    assert.equal(g.crew.filter((c) => c.side === "player").length, CREW_CAP);
    assert.match(g.event?.body ?? "", /There is no room aboard/);
  });
});

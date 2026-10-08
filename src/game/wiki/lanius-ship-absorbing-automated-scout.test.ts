import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageGotAway, pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-absorbing-automated-scout";
  b.name = "Lanius ship absorbing automated scout";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Lanius ship absorbing automated scout");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

function scrapBand(n: number): "low" | "medium" | "high" | "other" {
  if (n >= 7 && n <= 10) return "low";
  if (n >= 12 && n <= 18) return "medium";
  if (n >= 20 && n <= 23) return "high";
  if (n === 19) return "medium";
  return "other";
}

describe("Lanius ship absorbing automated scout", () => {
  it("fighting starts a Lanius escape with no surrender offer", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-absorbing-automated-scout:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-ship-absorbing-automated-scout");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemySurrender?.chance, 0);
    assert.equal(g.enemyEscape?.mode, "hull");
    assert.equal(g.enemyEscape?.chance, 80);
    assert.ok((g.enemyEscape?.threshold ?? 0) >= 20 && (g.enemyEscape?.threshold ?? 0) <= 40);
  });

  it("a destroyed ship pays medium scrap and a crew kill pays high, then inspect", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      const crew = g.crew.filter((c) => c.side === "player").length;
      assert.equal(pageWin(g, "lanius-ship-absorbing-automated-scout", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, dead ? /No more life signs/ : /Lanius craft breaks apart/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= (dead ? 19 : 12) && paid[0]! <= (dead ? 23 : 19), body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.fleet, 5);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-scout:inspect"), true);
    }
  });

  it("an escape inspects the scout and pays no fight scrap", () => {
    const g = createGame(3);
    open(g);
    pageGotAway(g, "lanius-ship-absorbing-automated-scout");
    assert.equal(g.phase, "event");
    assert.match(g.event?.body ?? "", /Lanius ship has escaped/);
    assert.equal(g.event?.body?.includes("Scrap:"), false);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-scout:inspect"), true);
  });

  it("inspecting pays random scrap, or that scrap and a one-turn fleet delay", () => {
    const seen = new Set<string>();
    const bands = new Set<string>();
    for (let seed = 1; seed <= 160 && (seen.size < 2 || bands.size < 3); seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "lanius-ship-absorbing-automated-scout", false);
      const before = g.scrap;
      const guns = g.player.weapons.length;
      const crew = g.crew.filter((c) => c.side === "player").length;
      choose(g, "q:lanius-scout:inspect");
      const body = g.event?.body ?? "";
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.equal(resources(body), 0, body);
      const band = scrapBand(paid[0]!);
      assert.notEqual(band, "other", body);
      bands.add(band);
      assert.equal(g.scrap, before + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      if (/delayed for 1 turn/.test(body)) {
        assert.equal(g.fleet, 4);
        seen.add("fleet");
      } else {
        assert.match(body, /surrounding beacons/);
        assert.equal(g.fleet, 5);
        seen.add("map");
      }
    }
    assert.deepEqual([...seen].sort(), ["fleet", "map"]);
    assert.deepEqual([...bands].sort(), ["high", "low", "medium"]);
  });

  it("leaving them alone spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-absorbing-automated-scout:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });
});

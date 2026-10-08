import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-attacking-civilian";
  b.name = "Lanius ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking civilian");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Lanius ship attacking civilian", () => {
  it("attacking starts a Lanius fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian");
    assert.equal(g.scrap, 10);
  });

  it("a destroyed ship pays medium scrap and a crew kill pays high", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      const crew = g.crew.filter((c) => c.side === "player").length;
      assert.equal(pageWin(g, "lanius-ship-attacking-civilian", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, dead ? /No more life signs/ : /Lanius craft breaks apart/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= (dead ? 19 : 12) && paid[0]! <= (dead ? 23 : 19), body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"), true);
    }
  });

  it("contact pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 5; seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "lanius-ship-attacking-civilian", false);
      const before = g.scrap;
      const guns = g.player.weapons.length;
      const crew = g.crew.filter((c) => c.side === "player").length;
      g.player.hull = 20;
      choose(g, "q:lanius-civilian:contact");
      const body = g.event?.body ?? "";
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      if (/shipwright/.test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 0, body);
        assert.equal(g.scrap, before + paid[0]!);
        assert.equal(g.player.hull, 20);
        seen.add("weapon");
      } else if (/patch up some of your hull/.test(body)) {
        assert.match(body, /Hull repairs: 5/);
        assert.equal(body.includes("Scrap:"), false);
        assert.equal(g.scrap, before);
        assert.equal(g.player.hull, 25);
        seen.add("repair");
      } else if (/science vessel/.test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + paid[0]!);
        seen.add("medium");
      } else if (/did not survive/.test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + paid[0]!);
        seen.add("low");
      } else {
        assert.match(body, /fast retreat/);
        assert.match(body, /Nothing happens/);
        assert.equal(body.includes("Scrap:"), false);
        assert.equal(g.scrap, before);
        assert.equal(g.player.hull, 20);
        seen.add("nothing");
      }
    }
    assert.deepEqual([...seen].sort(), ["low", "medium", "nothing", "repair", "weapon"]);
  });

  it("avoiding the conflict spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
  });
});

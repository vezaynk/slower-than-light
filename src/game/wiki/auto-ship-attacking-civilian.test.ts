import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-attacking-civilian";
  b.name = "Auto-ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Auto-ship attacking civilian");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Auto-ship attacking civilian", () => {
  it("aiding the civilian starts an Auto-ship fight", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-attacking-civilian:0"), true);
    choose(g, "c:auto-ship-attacking-civilian:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-attacking-civilian");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });

  it("a destroyed ship pays low scrap with resources, then offers to contact the civilian", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    assert.equal(pageWin(destroyed, "auto-ship-attacking-civilian", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /hasten to contact the civilian ship/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.fleet, 5);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    const gained = (destroyed.fuel - fuel) + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);
    assert.equal(destroyed.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"), true);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-attacking-civilian", true), false);
    assert.equal(killed.scrap, 10);
    assert.equal(killed.phase, "event");
  });

  it("contact pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 5; seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "auto-ship-attacking-civilian", false);
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

  it("staying out of it spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-attacking-civilian:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-attacking-outpost";
  b.name = "Auto-ship attacking outpost";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Auto-ship attacking outpost");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resourceLines(body: string): number {
  return [...body.matchAll(/(?:Fuel|Missiles|Drone parts): \d+/g)].length;
}

describe("Auto-ship attacking outpost", () => {
  it("intervening starts an Auto-ship fight", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-attacking-outpost:0"), true);
    choose(g, "c:auto-ship-attacking-outpost:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-attacking-outpost");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });

  it("a destroyed ship pays low scrap with resources, then the outpost pays medium", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    assert.equal(pageWin(destroyed, "auto-ship-attacking-outpost", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /quickly salvage what you can/);
    assert.match(body, /Take this on the house/);
    const paid = scraps(body);
    assert.equal(paid.length, 2, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.ok(paid[1]! >= 12 && paid[1]! <= 19, body);
    assert.equal(resourceLines(body), 4, body);
    assert.equal(destroyed.scrap, 10 + paid[0]! + paid[1]!);
    assert.equal(destroyed.fleet, 5);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    const gained = (destroyed.fuel - fuel) + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 4 && gained <= 12, body);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-attacking-outpost", true), false);
    assert.equal(killed.scrap, 10);
    assert.equal(killed.phase, "event");
  });

  it("avoiding the conflict spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-attacking-outpost:1");
    assert.equal(
      g.event?.body,
      "You steer clear of the conflict. The outpost receives a beating but the ship stops its attack before it's destroyed.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
  });
});

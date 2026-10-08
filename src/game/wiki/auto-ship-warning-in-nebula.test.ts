import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-warning-in-nebula";
  b.name = "Auto-ship warning in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Auto-ship warning in nebula");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Auto-ship warning in nebula", () => {
  it("starts a running Auto-ship on a 40 second timer that doubles pursuit", () => {
    const g = createGame(1);
    open(g);
    assert.equal(
      g.event?.body,
      "It appears that an automated Rebel scout was positioned within the nebula to warn of your passing.",
    );
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-warning-in-nebula:0"), true);
    choose(g, "c:auto-ship-warning-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-warning-in-nebula");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemyEscape?.mode, "start");
    assert.equal(g.enemyEscape?.seconds, 40);
    assert.equal(g.enemyEscape?.running, true);
    assert.equal(g.enemyEscape?.pursuit, true);
  });

  it("a destroyed ship pays low scrap with resources, and a crew kill does not", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    assert.equal(pageWin(destroyed, "auto-ship-warning-in-nebula", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /one step ahead of the fleet/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.fleet, 5);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    const gained = (destroyed.fuel - fuel) + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 5, body);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-warning-in-nebula", true), false);
    assert.equal(killed.scrap, 10);
    assert.equal(killed.phase, "event");
  });
});

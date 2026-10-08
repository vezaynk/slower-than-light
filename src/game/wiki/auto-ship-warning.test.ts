import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-warning";
  b.name = "Auto-ship warning";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Auto-ship warning");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Auto-ship warning", () => {
  it("starts a running Auto-ship on a 40 second timer that doubles pursuit", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-warning:0"), true);
    choose(g, "c:auto-ship-warning:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-warning");
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
    assert.equal(pageWin(destroyed, "auto-ship-warning", false), true);
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
    assert.equal(pageWin(killed, "auto-ship-warning", true), false);
    assert.equal(killed.scrap, 10);
    assert.equal(killed.phase, "event");
  });

  it("starts the running Auto-ship on arrival and leaves no button", () => {
    // The page has no choice. "Fight an Auto-ship that is running away."
    // The red line doubles pursuit only if the scout gets away.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:auto-ship-warning";
    dest.name = "Auto-ship warning";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "auto-ship-warning");
    // A normal jump advances the fleet by one. Doubled pursuit is the escape, not this arrival.
    assert.equal(g.fleet, 1);
    assert.equal(g.enemyEscape?.mode, "start");
    assert.equal(g.enemyEscape?.seconds, 40);
    assert.equal(g.enemyEscape?.running, true);
    assert.equal(g.enemyEscape?.pursuit, true);
    assert.ok(g.log.includes("The ship starts to power up its FTL Drive. If it gets away, it will no doubt warn the fleet of your position!"));
    assert.ok(g.log.some((line) => INTROS.includes(line)));
  });
});

const INTROS = [
  "You discover one of the Rebel's autonomous scouts. The ship's AI wastes no time in engaging your ship.",
  `Your ship is hailed: "This is an automated message. Resisting our takeover is pointless. Prepare to die." It appears this Rebel ship is run by an AI.`,
  "A Rebel autonomous scout is exploring this beacon. You attempt to hide behind a nearby moon, but the ship finds you and begins its assault.",
  "The AI of a nearby small Rebel scout immediately identifies you as a threat and engages.",
  "A Rebel ship moves in to engage. You attempt to open communications, but realize the futility of that action when you see the ship is run by an AI.",
  "This must be one of the Rebels' unmanned scout ships. Looks like there's no way around a fight.",
  "Another unmanned ship patrols this area. You prepare the ship for combat.",
  "This beacon is being patrolled by a unmanned scout. A fight is unavoidable.",
  "A small shuttle appears on the local radar. Turns out it is a Rebel automated scout!",
];

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { eventText } from "../event-text.ts";
import { textRe } from "./quest-text-re.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "AUTO_WARNING";
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
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  ).length;
}

const FTL = eventText("ship_REBEL_AUTO_WARNING_escape_text");

describe("Auto-ship warning", () => {
  it("shows the FTL warning, then starts a running Auto-ship on a 40 second timer that doubles pursuit", () => {
    const g = createGame(1);
    open(g);
    assert.equal(
      g.event?.choices.some((c) => c.id === "c:auto-ship-warning:0"),
      true,
    );
    choose(g, "c:auto-ship-warning:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, FTL);
    assert.equal(g.log.includes(FTL), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "auto");
    choose(g, "ship-resume");
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
    assert.match(
      body,
      textRe(
        "ship_REBEL_AUTO_WARNING_destroyed_text",
        "ship_SQUAT_WARNING_deadCrew_text",
        "ship_SQUAT_WARNING_destroyed_text",
      ),
    );
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.fleet, 5);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    const gained =
      destroyed.fuel - fuel + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 5, body);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-warning", true), false);
    assert.equal(killed.scrap, 10);
    assert.equal(killed.phase, "event");
  });

  it("starts the running Auto-ship from the arrival card", () => {
    // The arrival card stays up. "Fight an Auto-ship that is running away."
    // The red line doubles pursuit only if the scout gets away.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "AUTO_WARNING";
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
    const body = g.event?.body ?? "";
    assert.equal(g.phase, "event");
    assert.ok(INTROS.includes(body), body);
    assert.equal(g.log.includes(body), false);
    assert.equal(g.event?.choices[0]?.id, "c:auto-ship-warning:0");
    choose(g, "c:auto-ship-warning:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, FTL);
    assert.equal(g.log.includes(FTL), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
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
  });
});

const INTROS = [
  "Hostile Auto-ship.",
  `Your ship is hailed: "This is an automated message. Resisting our takeover is pointless. Prepare to die." It appears this Rebel ship is run by an AI.`,
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
];

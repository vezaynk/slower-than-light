import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-fight-crystal";
  b.name = "Auto-ship fight (Crystal)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship fight (Crystal)");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Auto-ship fight (Crystal)", () => {
  it("a destroyed ship pays medium scrap with resources, and a crew kill does not", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    const augments = destroyed.augments.length;
    assert.equal(pageWin(destroyed, "auto-ship-fight-crystal", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /substantial collection of useful scrap material/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.augments.length, augments);
    const gained = (destroyed.fuel - fuel) + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 5, body);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-fight-crystal", true), false);
    assert.equal(killed.scrap, 10);
    assert.equal(killed.phase, "event");
  });

  it("starts the Auto-ship on arrival and leaves no button", () => {
    // The page has no choice. "Fight an Auto-ship."
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:auto-ship-fight-crystal";
    dest.name = "Auto-ship fight (Crystal)";
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
    assert.equal(g.fightEvent, "auto-ship-fight-crystal");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes("The Rebels must have sent their automated scouts to find you. One jumps in and immediately moves to attack."));
  });
});

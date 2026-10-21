import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "AUTO_SUN";
  b.name = "Auto-ship fight near sun";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship fight near sun");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  ).length;
}

describe("Auto-ship fight near sun", () => {
  it("a destroyed ship pays medium scrap with resources, and a crew kill does not", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    const augments = destroyed.augments.length;
    assert.equal(pageWin(destroyed, "auto-ship-fight-near-sun", false), true);
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
    const gained =
      destroyed.fuel - fuel + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 5, body);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-fight-near-sun", true), false);
    assert.equal(killed.scrap, 10);
    assert.equal(killed.phase, "event");
  });

  it("shows the star card, then starts the Auto-ship fight", () => {
    // The arrival card stays up. "Fight an Auto-ship." redgiant=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "AUTO_SUN";
    dest.name = "Auto-ship fight near sun";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    const body =
      "You arrive at the beacon to find yourself dangerously close to a star. An automated Rebel ship, impervious to the heat, moves in to engage.";
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, body);
    assert.equal(g.log.includes(body), false);
    assert.equal(g.event?.choices[0]?.id, "c:auto-ship-fight-near-sun:0");
    assert.equal(g.fleet, 1);
    choose(g, "c:auto-ship-fight-near-sun:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.fightEvent, "auto-ship-fight-near-sun");
    assert.equal(g.asteroid, false);
    assert.equal(g.flare, true);
    assert.ok((g.flareWait ?? 0) >= 28 && (g.flareWait ?? 0) < 34);
    assert.equal(g.log.includes(body), false);
  });
});

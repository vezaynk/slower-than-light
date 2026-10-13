import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageGotAway, pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-warning";
  b.name = "Rebel ship warning";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Rebel ship warning reward", () => {
  it("a destroyed ship and a crew kill each pay medium scrap with resources", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    const augments = destroyed.augments.length;
    assert.equal(pageWin(destroyed, "rebel-ship-warning", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /Their ship breaks apart and you are relieved to know that you are still one step ahead of the fleet\./);
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
    assert.equal(pageWin(killed, "rebel-ship-warning", true), true);
    const killedBody = killed.event?.body ?? "";
    assert.match(killedBody, /Their ship goes silent and you are relieved to know that you are still one step ahead of the fleet\./);
    const medium = scraps(killedBody);
    assert.equal(medium.length, 1, killedBody);
    assert.ok(medium[0]! >= 12 && medium[0]! <= 19, killedBody);
    assert.equal(resources(killedBody), 2, killedBody);
    assert.equal(killed.scrap, 10 + medium[0]!);
  });

  it("an escape shows the printed scout sentence and does not double pursuit again", () => {
    const g = createGame(3);
    open(g);
    g.pursuitDouble = true;
    g.fleet = 4;
    pageGotAway(g, "rebel-ship-warning");
    assert.equal(
      g.event?.body,
      "The scout jumps away. They are sure to have informed the fleet of your position. You must get to the next Sector as soon as possible!\n\nRebel Fleet pursuit is doubled.",
    );
    assert.equal(g.pursuitDouble, true);
    assert.equal(g.fleet, 4);
    assert.equal(g.scrap, 10);
    assert.equal(g.phase, "event");
  });
});

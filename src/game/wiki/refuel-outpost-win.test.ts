import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-refueling-outpost";
  b.name = "Rebel ship attacking refueling outpost";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rebel ship attacking refueling outpost reward", () => {
  it("pays medium scrap when the ship is destroyed and high scrap on a crew kill", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const guns = destroyed.player.weapons.length;
    choose(destroyed, "c:rebel-ship-attacking-refueling-outpost:0");
    assert.equal(destroyed.fightEvent, "rebel-ship-attacking-refueling-outpost");
    assert.equal(pageWin(destroyed, "rebel-ship-attacking-refueling-outpost", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The ship breaks apart and you quickly salvage what you can/);
    assert.ok(destroyed.event?.choices.some((c) => c.id === "q:refuel-outpost:contact"));
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.player.weapons.length, guns);

    const killed = createGame(2);
    open(killed);
    choose(killed, "c:rebel-ship-attacking-refueling-outpost:0");
    assert.equal(pageWin(killed, "rebel-ship-attacking-refueling-outpost", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /With the crew dead you quickly salvage what you can/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + high[0]!);
  });

  it("contacting the outpost pays medium fuel and medium scrap", () => {
    const g = createGame(3);
    open(g);
    choose(g, "c:rebel-ship-attacking-refueling-outpost:0");
    assert.equal(pageWin(g, "rebel-ship-attacking-refueling-outpost", false), true);
    const fuel = g.fuel;
    const before = g.scrap;
    choose(g, "q:refuel-outpost:contact");
    const body = g.event?.body ?? "";
    assert.match(body, /The pompous bastards expected free service/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(g.scrap, before + paid[0]!);
    const fuelPaid = body.match(/Fuel: (\d+)/);
    assert.ok(fuelPaid);
    const n = Number(fuelPaid![1]);
    assert.ok(n >= 2 && n <= 4, body);
    assert.equal(g.fuel, fuel + n);
    assert.equal(resources(body), 1, body);
  });
});

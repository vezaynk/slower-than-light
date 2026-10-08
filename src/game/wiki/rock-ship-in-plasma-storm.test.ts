import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-ship-in-plasma-storm";
  b.name = "Rock ship in plasma storm";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Rock ship in plasma storm");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Rock ship in plasma storm", () => {
  it("arming the weapons starts a Rock fight, and leaving spends nothing", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:rock-ship-in-plasma-storm:2"), true);
    choose(g, "c:rock-ship-in-plasma-storm:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "rock-ship-in-plasma-storm");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.scrap, 10);

    const out = createGame(1);
    open(out);
    choose(out, "c:rock-ship-in-plasma-storm:1");
    assert.equal(out.phase, "map");
    assert.equal(out.scrap, 10);
    assert.equal(out.fleet, 5);
  });

  it("a living Rock crewmember is paid high scrap with resources", () => {
    const plain = createGame(1);
    open(plain);
    assert.equal(choiceDisabled(plain, "c:rock-ship-in-plasma-storm:2"), "Needs a Rock crewmember");
    choose(plain, "c:rock-ship-in-plasma-storm:2");
    assert.equal(plain.phase, "event");
    assert.equal(plain.scrap, 10);

    const dead = createGame(2);
    open(dead);
    dead.crew[0].kin = "stone";
    dead.crew[0].hp = 0;
    assert.equal(choiceDisabled(dead, "c:rock-ship-in-plasma-storm:2"), "Needs a Rock crewmember");

    const g = createGame(3);
    open(g);
    g.crew[0].kin = "stone";
    const guns = g.player.weapons.length;
    const crew = g.crew.filter((c) => c.side === "player").length;
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    assert.equal(choiceDisabled(g, "c:rock-ship-in-plasma-storm:2"), null);
    choose(g, "c:rock-ship-in-plasma-storm:2");
    const body = g.event?.body ?? "";
    assert.match(body, /thinner part of the nebula/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
    assert.equal(resources(body), 2, body);
    assert.equal(g.scrap, 10 + paid[0]!);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    const gained = (g.fuel - fuel) + (g.missiles - missiles) + (g.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);
    assert.equal(g.fleet, 5);
    assert.equal(g.phase, "event");
  });
});

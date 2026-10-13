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
  b.flag = "cited:slug-hacker-doors";
  b.name = "Slug hacker (doors)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function fitHacking(g: Game) {
  g.player.kits.spike = {
    id: "spike",
    level: 1,
    power: 1,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

describe("Slug hacker (doors) reward", () => {
  it("continue pays medium scrap when the ship is destroyed and high scrap on a crew kill", () => {
    const destroyed = createGame(1);
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const guns = destroyed.player.weapons.length;
    assert.equal(pageWin(destroyed, "slug-hacker-doors", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The Slug ship breaks apart and your systems return to normal/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.player.weapons.length, guns);

    const killed = createGame(2);
    assert.equal(pageWin(killed, "slug-hacker-doors", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /their hacking system shuts down and your systems return to normal/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + high[0]!);
  });

  it("countering the hack pays high scrap with resources either way", () => {
    const destroyed = createGame(3);
    fitHacking(destroyed);
    open(destroyed);
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const guns = destroyed.player.weapons.length;
    choose(destroyed, "c:slug-hacker-doors:1");
    assert.equal(destroyed.fightEvent, "slug-hacker-doors");
    assert.equal(pageWin(destroyed, "slug-hacker-doors", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /their hacking module is destroyed/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.player.weapons.length, guns);

    const killed = createGame(4);
    fitHacking(killed);
    open(killed);
    choose(killed, "c:slug-hacker-doors:1");
    assert.equal(pageWin(killed, "slug-hacker-doors", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /your weapon system returns to normal/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + high[0]!);
  });
});

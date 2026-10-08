import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-among-rebel-fleet";
  b.name = "Rebel fight among Rebel fleet";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight among Rebel fleet");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Rebel fight among Rebel fleet win", () => {
  it("pays low scrap only when the ship is destroyed", () => {
    const g = createGame(1);
    assert.equal(g.sector, 1);
    assert.equal(g.difficulty, "normal");
    const guns = g.player.weapons.length;
    assert.equal(pageWin(g, "rebel-fight-among-rebel-fleet", false), true);
    const body = g.event?.body ?? "";
    assert.match(body, /no time to salvage all of the wreck/);
    const paid = scraps(body).filter((n) => n > 0);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 0, body);
    assert.equal(g.scrap, 10 + paid[0]!);
    assert.equal(g.player.weapons.length, guns);
  });

  it("pays medium scrap with resources on a crew kill, and no weapon", () => {
    const g = createGame(1);
    const guns = g.player.weapons.length;
    assert.equal(pageWin(g, "rebel-fight-among-rebel-fleet", true), true);
    const body = g.event?.body ?? "";
    assert.match(body, /few nearby materials/);
    const paid = scraps(body).filter((n) => n > 0);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(g.player.weapons.length, guns);
  });

  it("fights a Rebel ship that never runs and never surrenders", () => {
    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:rebel-fight-among-rebel-fleet:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-among-rebel-fleet");
    assert.equal(g.enemyEscape?.mode, "never");
    assert.equal(g.enemySurrender?.chance, 0);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

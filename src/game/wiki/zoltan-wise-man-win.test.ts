import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { pageWin } from "./quests.ts";

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resourceHits(body: string): number {
  return [...body.matchAll(/(?:Fuel|Missiles|Drone parts): \d+/g)].length;
}

describe("Zoltan wise man reward", () => {
  it("a destroyed ship pays low scrap with resources, then high", () => {
    const g = createGame(1);
    const crew = g.crew.filter((c) => c.side === "player").length;
    const guns = g.player.weapons.length;
    assert.equal(pageWin(g, "zoltan-wise-man", false), true);
    const body = g.event?.body ?? "";
    assert.match(body, /You salvage the remains and contact the wise man/);
    assert.match(body, /the Zoltan implodes/);
    const paid = scraps(body);
    assert.equal(paid.length, 2, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.ok(paid[1]! >= 19 && paid[1]! <= 23, body);
    assert.equal(resourceHits(body), 4, body);
    assert.equal(g.scrap, 10 + paid[0]! + paid[1]!);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(g.player.weapons.length, guns);
  });

  it("a crew kill pays medium scrap with resources, then high", () => {
    const g = createGame(2);
    assert.equal(pageWin(g, "zoltan-wise-man", true), true);
    const body = g.event?.body ?? "";
    assert.match(body, /You salvage the ship and contact the wise man/);
    assert.match(body, /the Zoltan implodes/);
    const paid = scraps(body);
    assert.equal(paid.length, 2, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.ok(paid[1]! >= 19 && paid[1]! <= 23, body);
    assert.equal(resourceHits(body), 4, body);
    assert.equal(g.scrap, 10 + paid[0]! + paid[1]!);
  });
});

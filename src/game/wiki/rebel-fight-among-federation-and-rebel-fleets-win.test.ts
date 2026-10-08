import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { pageWin } from "./quests.ts";

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Rebel fight among Federation and Rebel fleets win", () => {
  it("pays low scrap only when the ship is destroyed", () => {
    const g = createGame(1);
    assert.equal(g.sector, 1);
    assert.equal(g.difficulty, "normal");
    const guns = g.player.weapons.length;
    assert.equal(pageWin(g, "rebel-fight-among-federation-and-rebel-fleets", false), true);
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
    assert.equal(pageWin(g, "rebel-fight-among-federation-and-rebel-fleets", true), true);
    const body = g.event?.body ?? "";
    assert.match(body, /few nearby materials/);
    const paid = scraps(body).filter((n) => n > 0);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(g.player.weapons.length, guns);
  });
});

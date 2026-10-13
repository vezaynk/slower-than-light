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

describe("Slug hacker (medical) reward", () => {
  it("a destroyed ship and a crew kill both pay high scrap with resources", () => {
    const destroyed = createGame(1);
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const guns = destroyed.player.weapons.length;
    assert.equal(pageWin(destroyed, "slug-hacker-medical", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The Slug ship breaks apart and your systems return to normal/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.player.weapons.length, guns);

    const killed = createGame(2);
    assert.equal(pageWin(killed, "slug-hacker-medical", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /you quickly shut off their hacking module and your systems return to normal/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + high[0]!);
    assert.equal(killed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(killed.player.weapons.length, guns);
  });
});

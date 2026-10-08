import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystal-fight-with-surrender-offer-hull-repairs";
  b.name = "Crystal fight with surrender offer (hull repairs)";
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

describe("Crystal fight with surrender offer (hull repairs) reward", () => {
  it("a destroyed ship and a crew kill each pay medium scrap with resources and no hull repair", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const hull = destroyed.player.hull;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    const augments = destroyed.augments.length;
    assert.equal(pageWin(destroyed, "crystal-fight-with-surrender-offer-hull-repairs", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The Crystalline ship shatters and you pick what you can from the debris\. The rest of the convoy used the time to put a significant amount of distance between you and them\. Nothing left to do but jump\./);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.player.hull, hull);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.augments.length, augments);
    const gained = (destroyed.fuel - fuel) + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);

    const killed = createGame(2);
    open(killed);
    const killedHull = killed.player.hull;
    assert.equal(pageWin(killed, "crystal-fight-with-surrender-offer-hull-repairs", true), true);
    const killedBody = killed.event?.body ?? "";
    assert.match(killedBody, /The crew of the enemy ship has been eliminated\. You scrap what you can\. The rest of the convoy used the time to put a significant amount of distance between you and them\. Nothing left to do but jump\./);
    const medium = scraps(killedBody);
    assert.equal(medium.length, 1, killedBody);
    assert.ok(medium[0]! >= 12 && medium[0]! <= 19, killedBody);
    assert.equal(resources(killedBody), 2, killedBody);
    assert.equal(killed.scrap, 10 + medium[0]!);
    assert.equal(killed.player.hull, killedHull);
  });
});

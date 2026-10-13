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
  b.flag = "cited:rebel-ship-attacking-crystal-ship";
  b.name = "Rebel ship attacking Crystal ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rebel ship attacking Crystal ship reward", () => {
  it("attacking the Rebel pays medium scrap when the ship is destroyed and high scrap on a crew kill", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const guns = destroyed.player.weapons.length;
    choose(destroyed, "c:rebel-ship-attacking-crystal-ship:0");
    assert.equal(destroyed.fightEvent, "rebel-ship-attacking-crystal-ship");
    assert.equal(destroyed.enemy?.faction, "rebel");
    assert.equal(pageWin(destroyed, "rebel-ship-attacking-crystal-ship", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The Rebels destroyed, you pick the bones of their ship/);
    assert.ok(destroyed.event?.choices.some((c) => c.id === "q:rebel-crystal:contact"));
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.player.weapons.length, guns);

    const killed = createGame(2);
    open(killed);
    choose(killed, "c:rebel-ship-attacking-crystal-ship:0");
    assert.equal(pageWin(killed, "rebel-ship-attacking-crystal-ship", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /The Rebels destroyed, you pick the bones of their ship/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + high[0]!);
  });

  it("attacking the Crystalline ship stays on default rewards", () => {
    const g = createGame(3);
    open(g);
    choose(g, "c:rebel-ship-attacking-crystal-ship:1");
    assert.equal(g.enemy?.faction, "crystal");
    assert.equal(pageWin(g, "rebel-ship-attacking-crystal-ship", false), false);
    assert.equal(g.scrap, 10);
    assert.equal(g.phase, "combat");
  });
});

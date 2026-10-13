import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-civilian-lanius";
  b.name = "Pirate ship attacking civilian (Lanius)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Pirate ship attacking civilian (Lanius)");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Pirate ship attacking civilian (Lanius)", () => {
  it("attacking the pirate starts a pirate fight", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian-lanius:0"), true);
    choose(g, "c:pirate-ship-attacking-civilian-lanius:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian-lanius");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });

  it("a destroyed ship pays medium scrap, and a crew kill pays high, then the contact", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    assert.equal(pageWin(destroyed, "pirate-ship-attacking-civilian-lanius", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The pirate ship breaks apart/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"), true);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "pirate-ship-attacking-civilian-lanius", true), true);
    const killedBody = killed.event?.body ?? "";
    assert.match(killedBody, /hasten to contact the civilian ship/);
    const high = scraps(killedBody);
    assert.equal(high.length, 1, killedBody);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, killedBody);
    assert.equal(resources(killedBody), 2, killedBody);
    assert.equal(killed.scrap, 10 + high[0]!);
    assert.equal(killed.fleet, 5);
  });

  it("avoiding the conflict spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian-lanius:1");
    assert.equal(
      g.event?.body,
      "Unfortunately it is not your mission to save every person affected by this war or the Lanius invasion.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.notEqual(g.phase, "combat");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });
});

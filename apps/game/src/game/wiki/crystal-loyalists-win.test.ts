import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystal-ship-attacking-federation-loyalists";
  b.name = "Crystal ship attacking Federation loyalists";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crystal ship attacking Federation loyalists");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Crystal ship attacking Federation loyalists reward", () => {
  it("a destroyed ship pays medium scrap with resources and a crew kill pays high", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    const augments = destroyed.augments.length;
    assert.equal(pageWin(destroyed, "crystal-ship-attacking-federation-loyalists", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The Crystalline ship shatters and you pick what you can from the debris/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.augments.length, augments);
    const gained = (destroyed.fuel - fuel) + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);
    assert.ok(destroyed.event?.choices.some((c) => c.id === "q:crystal-loyalists:contact"));

    const killed = createGame(2);
    open(killed);
    const killedCrew = killed.crew.filter((c) => c.side === "player").length;
    assert.equal(pageWin(killed, "crystal-ship-attacking-federation-loyalists", true), true);
    const killedBody = killed.event?.body ?? "";
    assert.match(killedBody, /The crew of the enemy ship has been eliminated\. You scrap what you can/);
    const high = scraps(killedBody);
    assert.equal(high.length, 1, killedBody);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, killedBody);
    assert.equal(resources(killedBody), 2, killedBody);
    assert.equal(killed.scrap, 10 + high[0]!);
    assert.equal(killed.crew.filter((c) => c.side === "player").length, killedCrew);
  });

  it("contacting the Federation ship pays low scrap or resources, and does not add a crewmember", () => {
    let survivor = false;
    let materials = false;
    for (let seed = 1; seed <= 40 && (!survivor || !materials); seed++) {
      const g = createGame(seed);
      open(g);
      const crew = g.crew.filter((c) => c.side === "player").length;
      const guns = g.player.weapons.length;
      const augments = g.augments.length;
      assert.equal(pageWin(g, "crystal-ship-attacking-federation-loyalists", false), true);
      const before = g.scrap;
      choose(g, "q:crystal-loyalists:contact");
      const body = g.event?.body ?? "";
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, before + paid[0]!);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.augments.length, augments);
      if (body.includes("only one person made it")) survivor = true;
      if (body.includes("They transfer some excess materials")) materials = true;
    }
    assert.equal(survivor && materials, true);
  });
});

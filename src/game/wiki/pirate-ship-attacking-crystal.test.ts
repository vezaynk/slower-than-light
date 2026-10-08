import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-crystal";
  b.name = "Pirate ship attacking Crystal";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship attacking Crystal");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Pirate ship attacking Crystal", () => {
  it("attacking starts a pirate fight, and ignoring them does nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-ship-attacking-crystal:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "pirate-ship-attacking-crystal");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);

    const leave = createGame(2);
    open(leave);
    choose(leave, "c:pirate-ship-attacking-crystal:1");
    assert.notEqual(leave.phase, "combat");
    assert.equal(leave.scrap, 10);
    assert.equal(leave.enemy, null);
  });

  it("a destroyed ship pays medium scrap with resources, and a crew kill pays high", () => {
    const destroyed = createGame(3);
    open(destroyed);
    assert.equal(pageWin(destroyed, "pirate-ship-attacking-crystal", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /ship explodes/);
    const paid = scraps(body);
    assert.equal(paid.length, 1);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.event?.choices.some((c) => c.id === "q:crystal-pirate:contact"), true);

    const killed = createGame(4);
    open(killed);
    assert.equal(pageWin(killed, "pirate-ship-attacking-crystal", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /crew dead/);
    const high = scraps(dead);
    assert.equal(high.length, 1);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
  });

  it("contacting them pays random resources, nothing, or no Crystal weapon", () => {
    const seen = new Set<string>();
    const tiers = new Set<string>();
    let nothing = false;
    let weapon = false;
    for (let seed = 1; seed <= 80 && (seen.size < 5 || tiers.size < 3 || !nothing || !weapon); seed++) {
      const g = createGame(seed);
      open(g);
      pageWin(g, "pirate-ship-attacking-crystal", false);
      const scrap = g.scrap;
      const guns = g.player.weapons.length;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      choose(g, "q:crystal-pirate:contact");
      const body = g.event?.body ?? "";
      const text = body.split("\n\n")[0] ?? "";
      seen.add(text);
      assert.equal(g.player.weapons.length, guns, body);
      if (body.includes("Crystal weapon")) {
        weapon = true;
        assert.equal(g.scrap, scrap);
        assert.equal(resources(body), 0);
      } else if (body.includes("Nothing happens")) {
        nothing = true;
        assert.equal(g.scrap, scrap);
        assert.equal(g.fuel, fuel);
      } else {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, scrap + paid[0]!);
        const gained = (g.fuel - fuel) + (g.missiles - missiles) + (g.player.parts - parts);
        assert.ok(gained >= 2 && gained <= 6, body);
        if (paid[0]! >= 7 && paid[0]! <= 10) tiers.add("low");
        else if (paid[0]! >= 12 && paid[0]! <= 18) tiers.add("medium");
        else if (paid[0]! >= 20 && paid[0]! <= 23) tiers.add("high");
      }
    }
    assert.equal(seen.size, 5);
    assert.equal(nothing && weapon, true);
    assert.equal(tiers.has("low") && tiers.has("medium") && tiers.has("high"), true);
  });
});

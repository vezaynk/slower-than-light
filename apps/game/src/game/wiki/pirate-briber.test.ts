import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageGotAway, pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-briber";
  b.name = "Pirate briber";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Pirate briber");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Pirate briber", () => {
  it("accepting the bribe pays low scrap with resources, and attacking starts a pirate fight", () => {
    const g = createGame(1);
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const guns = g.player.weapons.length;
    const crew = g.crew.filter((c) => c.side === "player").length;
    choose(g, "c:pirate-briber:0");
    const body = g.event?.body ?? "";
    assert.match(body, /richer/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 2, body);
    assert.equal(g.scrap, 10 + paid[0]!);
    const gained = (g.fuel - fuel) + (g.missiles - missiles) + (g.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(g.phase, "event");
    assert.equal(g.fleet, 5);

    const fight = createGame(2);
    open(fight);
    choose(fight, "c:pirate-briber:1");
    assert.equal(fight.phase, "combat");
    assert.equal(fight.fightEvent, "pirate-briber");
    assert.equal(fight.enemy?.pirate, true);
    assert.equal(fight.scrap, 10);
  });

  it("a destroyed ship pays random scrap only, and a crew kill pays medium scrap with resources", () => {
    const tiers = new Set<string>();
    for (let seed = 1; seed <= 80 && tiers.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "pirate-briber", false), true);
      const body = g.event?.body ?? "";
      assert.match(body, /substantial collection/);
      assert.equal(resources(body), 0, body);
      assert.equal(g.player.weapons.length, guns);
      const n = scraps(body)[0]!;
      assert.equal(scraps(body).length, 1, body);
      assert.equal(g.scrap, 10 + n);
      assert.equal(g.event?.choices.some((c) => c.id === "q:pirate-briber:gone"), true);
      if (n >= 7 && n <= 10) tiers.add("low");
      else if (n >= 12 && n <= 18) tiers.add("medium");
      else if (n >= 20 && n <= 23) tiers.add("high");
      else assert.ok(n === 19, body);
    }
    assert.equal(tiers.has("low") && tiers.has("medium") && tiers.has("high"), true);

    const killed = createGame(3);
    open(killed);
    const fuel = killed.fuel;
    const missiles = killed.missiles;
    const parts = killed.player.parts;
    assert.equal(pageWin(killed, "pirate-briber", true), true);
    const body = killed.event?.body ?? "";
    assert.match(body, /dead in space/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(killed.scrap, 10 + paid[0]!);
    const gained = (killed.fuel - fuel) + (killed.missiles - missiles) + (killed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);
  });

  it("an escape pays nothing, then the victim pays one of the five printed results", () => {
    const gone = createGame(4);
    open(gone);
    pageGotAway(gone, "pirate-briber");
    assert.match(gone.event?.body ?? "", /abandoned pursuit/);
    assert.equal(gone.scrap, 10);
    assert.equal(gone.event?.choices.some((c) => c.id === "q:pirate-briber:gone"), true);

    const seen = new Set<string>();
    let rebelSeed = 0;
    for (let seed = 1; seed <= 80 && seen.size < 5; seed++) {
      const g = createGame(seed);
      open(g);
      pageWin(g, "pirate-briber", false);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      g.player.hull = g.player.hullMax - 20;
      const hull = g.player.hull;
      choose(g, "q:pirate-briber:gone");
      const body = g.event?.body ?? "";
      if (g.phase === "store") {
        seen.add("store");
        assert.equal(g.scrap, scrap);
        assert.ok(g.log.some((line) => /arms dealer/.test(line)));
      } else if (/patch your ship/.test(body)) {
        seen.add("repair");
        assert.equal(g.player.hull, hull + 15);
        assert.equal(g.scrap, scrap);
      } else if (/Rebel scout/.test(body)) {
        seen.add("rebel");
        rebelSeed = seed;
        assert.equal(g.scrap, scrap);
        assert.equal(g.event?.choices.some((c) => c.id === "q:pirate-briber:salvage"), true);
        assert.equal(g.event?.choices.some((c) => c.id === "q:pirate-briber:delay"), true);
      } else if (/hull breach/.test(body)) {
        seen.add("scrap");
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.equal(resources(body), 0, body);
        assert.equal(g.scrap, scrap + paid[0]!);
        assert.equal(g.fuel, fuel);
        assert.equal(g.missiles, missiles);
        assert.equal(g.player.parts, parts);
      } else {
        seen.add("nothing");
        assert.match(body, /jumps away/);
        assert.match(body, /Nothing happens/);
        assert.equal(g.scrap, scrap);
      }
    }
    assert.deepEqual([...seen].sort(), ["nothing", "rebel", "repair", "scrap", "store"]);
    assert.ok(rebelSeed > 0);

    const salvage = createGame(rebelSeed);
    open(salvage);
    pageWin(salvage, "pirate-briber", false);
    choose(salvage, "q:pirate-briber:gone");
    const before = salvage.scrap;
    const fuel = salvage.fuel;
    const missiles = salvage.missiles;
    const parts = salvage.player.parts;
    choose(salvage, "q:pirate-briber:salvage");
    const body = salvage.event?.body ?? "";
    assert.match(body, /strip the ship/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 2, body);
    assert.equal(salvage.scrap, before + paid[0]!);
    const gained = (salvage.fuel - fuel) + (salvage.missiles - missiles) + (salvage.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);

    const delay = createGame(rebelSeed);
    open(delay);
    pageWin(delay, "pirate-briber", false);
    choose(delay, "q:pirate-briber:gone");
    choose(delay, "q:pirate-briber:delay");
    assert.equal(delay.fleet, 4);
    assert.match(delay.event?.body ?? "", /delayed for 1 turn/);

    const last = createGame(rebelSeed);
    open(last);
    pageWin(last, "pirate-briber", false);
    choose(last, "q:pirate-briber:gone");
    last.sector = 8;
    last.sectorName = "The Last Stand";
    choose(last, "q:pirate-briber:delay");
    assert.equal(last.fleet, 5);
    assert.match(last.event?.body ?? "", /No effect in The Last Stand/);
  });
});

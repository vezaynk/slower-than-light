import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { HULL_RUN_SECONDS } from "./escape.ts";
import { surrenderPlan } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ships-in-plasma-storm";
  b.name = "Pirate ships in plasma storm";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ships in plasma storm");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function amount(body: string, label: string): number | undefined {
  const m = body.match(new RegExp(`${label}: (\\d+)`));
  return m ? Number(m[1]) : undefined;
}

describe("Pirate ships in plasma storm", () => {
  it("lets them leave, and each cargo fight is a pirate that never surrenders", () => {
    const leave = createGame(1);
    open(leave);
    const fuelBefore = leave.fuel;
    leave.fleet = 5;
    choose(leave, "c:pirate-ships-in-plasma-storm:2");
    assert.equal(leave.event?.body, "Sometimes discretion is the better part of valor.\n\nNothing happens.");
    assert.equal(leave.phase, "event");
    assert.equal(leave.scrap, 10);
    assert.equal(leave.fuel, fuelBefore);
    assert.equal(leave.fleet, 5);
    assert.equal(leave.enemy, null);

    const fuel = createGame(2);
    open(fuel);
    choose(fuel, "c:pirate-ships-in-plasma-storm:0");
    assert.equal(fuel.phase, "combat");
    assert.equal(fuel.fightEvent, "pirate-ships-in-plasma-storm");
    assert.equal(fuel.enemy?.pirate, true);
    assert.equal(fuel.enemyEscape?.mode, "hull");
    assert.equal(fuel.enemyEscape?.chance, 50);
    assert.equal(fuel.enemyEscape?.seconds, HULL_RUN_SECONDS);
    assert.ok((fuel.enemyEscape?.threshold ?? -1) >= 20 && (fuel.enemyEscape?.threshold ?? 99) < 40);
    assert.equal(fuel.enemySurrender?.chance, 0);
    assert.equal(surrenderPlan({ tier: "pool", event: "pirate-ships-in-plasma-storm", pirate: true }, () => 0).chance, 0);
    assert.equal(fuel.player.storm, undefined);

    const ammo = createGame(3);
    open(ammo);
    choose(ammo, "c:pirate-ships-in-plasma-storm:1");
    assert.equal(ammo.phase, "combat");
    assert.equal(ammo.fightEvent, "pirate-ships-in-plasma-storm-ammo");
    assert.equal(ammo.enemy?.pirate, true);
    assert.equal(ammo.enemyEscape?.chance, 50);
    assert.equal(ammo.enemySurrender?.chance, 0);
    assert.equal(surrenderPlan({ tier: "pool", event: "pirate-ships-in-plasma-storm-ammo", pirate: true }, () => 0).chance, 0);
  });

  it("pays low fuel and scrap when the fuel ship is destroyed, and high fuel and scrap on a crew kill", () => {
    for (const deadCrew of [false, true]) {
      const g = createGame(deadCrew ? 4 : 5);
      open(g);
      const beforeFuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "pirate-ships-in-plasma-storm", deadCrew), true);
      const body = g.event?.body ?? "";
      assert.match(body, deadCrew ? /salvage most of the fuel supplies/ : /scant fuel canisters/);
      const scrap = scraps(body);
      assert.equal(scrap.length, 1, body);
      const fuel = amount(body, "Fuel");
      assert.equal(amount(body, "Missiles"), undefined, body);
      assert.equal(amount(body, "Drone parts"), undefined, body);
      if (deadCrew) {
        assert.ok(scrap[0]! >= 19 && scrap[0]! <= 23, body);
        assert.ok(fuel !== undefined && fuel >= 3 && fuel <= 6, body);
      } else {
        assert.ok(scrap[0]! >= 7 && scrap[0]! <= 10, body);
        assert.ok(fuel !== undefined && fuel >= 1 && fuel <= 3, body);
      }
      assert.equal(g.scrap, 10 + scrap[0]!);
      assert.equal(g.fuel, beforeFuel + fuel!);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.player.storm, undefined);
    }
  });

  it("pays low missiles and scrap when the ammunition ship is destroyed, and high missiles and scrap on a crew kill", () => {
    for (const deadCrew of [false, true]) {
      const g = createGame(deadCrew ? 6 : 7);
      open(g);
      const fuel = g.fuel;
      const beforeMissiles = g.missiles;
      const parts = g.player.parts;
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "pirate-ships-in-plasma-storm-ammo", deadCrew), true);
      const body = g.event?.body ?? "";
      assert.match(body, deadCrew ? /salvage most of the ammunition/ : /scant ammunition crates/);
      const scrap = scraps(body);
      assert.equal(scrap.length, 1, body);
      const missiles = amount(body, "Missiles");
      assert.equal(amount(body, "Fuel"), undefined, body);
      assert.equal(amount(body, "Drone parts"), undefined, body);
      if (deadCrew) {
        assert.ok(scrap[0]! >= 19 && scrap[0]! <= 23, body);
        assert.ok(missiles !== undefined && missiles >= 4 && missiles <= 8, body);
      } else {
        assert.ok(scrap[0]! >= 7 && scrap[0]! <= 10, body);
        assert.ok(missiles !== undefined && missiles >= 1 && missiles <= 2, body);
      }
      assert.equal(g.scrap, 10 + scrap[0]!);
      assert.equal(g.missiles, beforeMissiles + missiles!);
      assert.equal(g.fuel, fuel);
      assert.equal(g.player.parts, parts);
      assert.equal(g.player.weapons.length, guns);
    }
  });
});

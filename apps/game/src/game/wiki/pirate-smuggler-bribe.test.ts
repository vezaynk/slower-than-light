import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-smuggler";
  b.name = "Pirate smuggler";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate smuggler");
}

describe("Pirate smuggler weapons", () => {
  it("keeps the weapons threat closed below level 6, and a bribe pays medium fuel and scrap", () => {
    const closed = createGame(1);
    open(closed);
    assert.match(closed.event?.body ?? "", /smuggler trying to stay away/);
    assert.ok(closed.event?.choices.some((c) => c.id === "c:pirate-smuggler:2"));
    assert.equal(choiceDisabled(closed, "c:pirate-smuggler:2"), "Needs level 6 Weapons");
    choose(closed, "c:pirate-smuggler:2");
    assert.equal(closed.phase, "event");
    assert.match(closed.event?.body ?? "", /smuggler trying to stay away/);

    const g = createGame(2);
    open(g);
    g.player.systems.weapons.level = 6;
    assert.equal(choiceDisabled(g, "c:pirate-smuggler:2"), null);
    choose(g, "c:pirate-smuggler:2");
    assert.match(g.event?.body ?? "", /no need for aggression/i);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const guns = g.player.weapons.length;
    choose(g, "q:pirate-smuggler:bribe");
    const body = g.event?.body ?? "";
    const scrap = Number(body.match(/Scrap: (\d+)/)?.[1]);
    const got = Number(body.match(/Fuel: (\d+)/)?.[1]);
    assert.ok(scrap >= 12 && scrap <= 19, body);
    assert.ok(got >= 2 && got <= 4, body);
    assert.equal(body.includes("Missiles:"), false);
    assert.equal(body.includes("Drone parts:"), false);
    assert.equal(g.scrap, 10 + scrap);
    assert.equal(g.fuel, fuel + got);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
    assert.equal(g.player.weapons.length, guns);
  });

  it("ignoring the bribe starts the smuggler fight", () => {
    const g = createGame(3);
    open(g);
    g.player.systems.weapons.level = 6;
    choose(g, "c:pirate-smuggler:2");
    choose(g, "q:pirate-smuggler:attack");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "pirate-smuggler");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.enemyEscape?.seconds, 35);
    assert.equal(g.enemyEscape?.chance, 100);
    assert.equal(g.enemySurrender?.chance, 50);
  });
});

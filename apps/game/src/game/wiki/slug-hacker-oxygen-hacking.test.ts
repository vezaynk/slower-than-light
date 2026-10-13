import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armSpike, launchSpike } from "../extras/spike.ts";
import { choiceDisabled, choose, createGame, playerHackingOff, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD = "Your hacking system automatically counters the digital assault and you move in to fight the ship.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-oxygen";
  b.name = "Slug hacker (oxygen)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (oxygen)");
}

describe("Slug hacker (oxygen) hacking", () => {
  it("stays closed without Hacking", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-oxygen:2" && c.label === "Counter the remote hacking."));
    assert.equal(choiceDisabled(g, "c:slug-hacker-oxygen:2"), "Needs a Hacking system");
    choose(g, "c:slug-hacker-oxygen:2");
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
  });

  it("shows the printed counter sentence, takes Hacking offline, and starts a Slug fight", () => {
    const g = createGame(2);
    g.player.kits.spike = {
      id: "spike",
      level: 1,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    g.player.parts = 2;
    g.player.systems.oxygen.level = 1;
    g.player.systems.oxygen.power = 1;
    g.player.systems.oxygen.damage = 0;
    g.player.systems.oxygen.ion = [];
    for (const d of g.player.doors) d.open = false;
    for (const r of g.player.rooms) {
      r.o2 = 50;
      r.fire = 0;
      r.breach = 0;
    }
    open(g);
    assert.equal(choiceDisabled(g, "c:slug-hacker-oxygen:2"), null);
    choose(g, "c:slug-hacker-oxygen:2");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "slug-hacker-oxygen");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.kits.spike?.level, 1);
    assert.equal(playerHackingOff(g), true);
    const aimed = ["shields", "weapons", "oxygen", "engines"].some((id) => armSpike(g, id));
    assert.equal(aimed, true);
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, 2);
    assert.ok(g.enemy);
    for (const w of g.enemy.weapons) w.enabled = false;
    if (g.enemy.kits.spike) {
      g.enemy.kits.spike.on = false;
      g.enemy.kits.spike.power = 0;
    }
    const room = g.player.rooms[0];
    assert.ok(room);
    const before = room.o2;
    step(g, 0.05);
    assert.ok(room.o2 > before);
  });
});

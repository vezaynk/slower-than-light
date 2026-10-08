import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armSpike, launchSpike } from "../extras/spike.ts";
import { choiceDisabled, choose, createGame, doorLevel, playerHackingOff } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD = "Your hacking system automatically counters the digital assault and you move in to fight the ship.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-doors";
  b.name = "Slug hacker (doors)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (doors)");
}

function fitHacking(g: Game) {
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
}

describe("Slug hacker (doors) hacking", () => {
  it("stays closed without Hacking", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-doors:1" && c.label === "Counter the remote hacking."));
    assert.equal(choiceDisabled(g, "c:slug-hacker-doors:1"), "Needs a Hacking system");
    choose(g, "c:slug-hacker-doors:1");
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
    assert.ok(doorLevel(g, g.player, "player") > 0);
  });

  it("shows the printed counter sentence, takes Hacking offline, and leaves the doors online", () => {
    const g = createGame(2);
    fitHacking(g);
    g.player.systems.doors.level = 3;
    g.player.systems.doors.damage = 0;
    g.player.systems.doors.ion = [];
    open(g);
    assert.equal(choiceDisabled(g, "c:slug-hacker-doors:1"), null);
    choose(g, "c:slug-hacker-doors:1");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "slug-hacker-doors");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.kits.spike?.level, 1);
    assert.equal(playerHackingOff(g), true);
    assert.equal(g.player.systems.doors.level, 3);
    assert.ok(doorLevel(g, g.player, "player") >= 2);
    const aimed = ["shields", "weapons", "oxygen", "engines"].some((id) => armSpike(g, id));
    assert.equal(aimed, true);
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, 2);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armSpike, launchSpike } from "../extras/spike.ts";
import { choiceDisabled, choose, createGame, doorLevel, playerHackingOff, playerMedicalOff } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD = "Your hacking system automatically counters the digital assault and you move in to fight the ship.";
const BODY =
  "Your arrival is greeted by numerous computer alerts. The nearby automated Rebel scout has deployed a virus and disrupted your shield system. Hopefully it won't cause further problems before you can destroy it.";
const COUNTER = "c:auto-ship-carrying-shield-virus:1";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-carrying-shield-virus";
  b.name = "Auto-ship carrying shield virus";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship carrying shield virus");
  assert.equal(g.event?.body, BODY);
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

function fullShields(g: Game) {
  g.player.systems.shields.level = 4;
  g.player.systems.shields.power = 4;
  g.player.systems.shields.damage = 0;
  g.player.systems.shields.ion = [];
  g.player.shieldNow = 2;
}

describe("Auto-ship carrying shield virus hacking", () => {
  it("stays closed without Hacking", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === COUNTER && c.label === "Counter the remote hacking."));
    assert.equal(choiceDisabled(g, COUNTER), "Needs a Hacking system");
    choose(g, COUNTER);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
    assert.equal(g.log.includes(LEAD), false);
    assert.equal(g.event?.title, "Auto-ship carrying shield virus");
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:auto-ship-carrying-shield-virus:0"));
    assert.ok(g.event?.choices.some((c) => c.id === COUNTER));
  });

  it("shows the printed counter sentence, takes Hacking offline, and does not halve shields", () => {
    const g = createGame(2);
    fitHacking(g);
    fullShields(g);
    const doors = g.player.systems.doors.level;
    const oxygen = g.player.systems.oxygen.level;
    const medbay = g.player.systems.medbay.level;
    open(g);
    assert.equal(choiceDisabled(g, COUNTER), null);
    choose(g, COUNTER);
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-carrying-shield-virus");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.kits.spike?.level, 1);
    assert.equal(playerHackingOff(g), true);
    assert.equal(g.player.shieldNow, 2);
    assert.equal(g.player.systems.shields.level, 4);
    assert.equal(g.player.systems.shields.power, 4);
    assert.equal(g.crew.some((c) => c.side === "enemy" && c.aboard === "player"), false);
    assert.equal(g.player.systems.doors.level, doors);
    assert.ok(doorLevel(g, g.player, "player") > 0);
    assert.equal(g.player.systems.oxygen.level, oxygen);
    assert.equal(g.player.systems.medbay.level, medbay);
    assert.equal(playerMedicalOff(g), false);
    const aimed = ["shields", "weapons", "oxygen", "engines"].some((id) => armSpike(g, id));
    assert.equal(aimed, true);
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, 2);
  });

  it("still halves shields on Continue", () => {
    const g = createGame(3);
    fullShields(g);
    open(g);
    choose(g, "c:auto-ship-carrying-shield-virus:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-carrying-shield-virus");
    assert.equal(g.player.systems.shields.level, 4);
    assert.equal(g.player.shieldNow, 1);
    assert.equal(playerHackingOff(g), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armSpike, launchSpike } from "../extras/spike.ts";
import { kinOf } from "../extras/kin.ts";
import { choiceDisabled, choose, createGame, playerHackingOff, playerMedicalOff, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD = "You are able to undo the damage of their remote hacking satellite but it's taking everything your hacking system has. Time to take out the enemy the old fashioned way.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-medical";
  b.name = "Slug hacker (medical)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (medical)");
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

describe("Slug hacker (medical) hacking", () => {
  it("stays closed without Hacking", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-medical:1" && c.label === "Counter the remote hacking."));
    assert.equal(choiceDisabled(g, "c:slug-hacker-medical:1"), "Needs a Hacking system");
    choose(g, "c:slug-hacker-medical:1");
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
    assert.equal(playerMedicalOff(g), false);
  });

  it("shows the printed counter sentence, beams two slugs, takes Hacking offline, and leaves the medbay online", () => {
    const g = createGame(2);
    fitHacking(g);
    g.player.systems.medbay.level = 3;
    g.player.systems.medbay.power = 3;
    g.player.systems.medbay.damage = 0;
    g.player.systems.medbay.ion = [];
    const bay = g.player.rooms.find((r) => r.system === "medbay");
    assert.ok(bay);
    const patient = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(patient);
    patient.room = bay.id;
    patient.aboard = "player";
    patient.path = [];
    patient.hp = Math.max(1, patient.maxHp - 20);
    bay.fire = 0;
    bay.o2 = 100;
    open(g);
    assert.equal(choiceDisabled(g, "c:slug-hacker-medical:1"), null);
    choose(g, "c:slug-hacker-medical:1");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "slug-hacker-medical");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.kits.spike?.level, 1);
    assert.equal(playerHackingOff(g), true);
    assert.equal(playerMedicalOff(g), false);
    assert.equal(g.player.systems.medbay.level, 3);
    const aimed = ["shields", "weapons", "oxygen", "engines"].some((id) => armSpike(g, id));
    assert.equal(aimed, true);
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, 2);
    const hp = kinOf("gel").hp;
    const rooms = new Set(g.player.rooms.map((r) => r.id));
    const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.equal(boarders.length, 2);
    assert.ok(boarders.every((c) => c.name === "Slug" && c.kin === "gel" && c.hp === hp && c.maxHp === hp && rooms.has(c.room)));
    assert.ok(g.log.includes("2 slug boarders beam aboard your ship."));
    const away = g.player.rooms.find((r) => r.id !== bay.id);
    assert.ok(away);
    for (const boarder of boarders) boarder.room = away.id;
    assert.ok(g.enemy);
    for (const w of g.enemy.weapons) w.enabled = false;
    for (const kit of Object.values(g.enemy.kits)) {
      if (!kit) continue;
      kit.power = 0;
      kit.on = false;
    }
    const hurt = patient.hp;
    step(g, 0.05);
    assert.ok(patient.hp > hurt);
  });
});

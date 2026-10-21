import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "NEBULA_SLUG_CHOOSE_DEATH";
  b.name = "Slug hacker (choice)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (choice)");
}

describe("Slug hacker (choice) fight lead-ins", () => {
  it("prints each choice's lead-in, halves that system, and fights a Slug ship", () => {
    const shields = createGame(1);
    open(shields);
    shields.player.systems.shields.level = 4;
    shields.player.systems.shields.power = 4;
    shields.player.systems.shields.damage = 0;
    shields.player.systems.shields.ion = [];
    shields.player.shieldNow = 2;
    const shieldsLead = `"Very good then!" Your shield power suddenly drops and they charge.`;
    choose(shields, "c:slug-hacker-choice:0");
    assert.equal(shields.phase, "event");
    assert.equal(shields.event?.choices[0]?.id, "ship-resume");
    assert.equal(shields.event?.body, shieldsLead);
    assert.equal(shields.log.includes(shieldsLead), false);
    choose(shields, "ship-resume");
    assert.equal(shields.phase, "combat");
    assert.equal(shields.enemy?.faction, "slug");
    assert.equal(shields.fightEvent, "slug-hacker-choice");
    assert.equal(shields.scrap, 10);
    assert.equal(shields.player.shieldNow, 1);

    const air = createGame(2);
    open(air);
    const airLead = `"A being that would choose sssuffocation? Who am I to judge..." Your life support shuts off and they move in to attack.`;
    choose(air, "c:slug-hacker-choice:1");
    assert.equal(air.phase, "event");
    assert.equal(air.event?.choices[0]?.id, "ship-resume");
    assert.equal(air.event?.body, airLead);
    assert.equal(air.log.includes(airLead), false);
    choose(air, "ship-resume");
    assert.equal(air.phase, "combat");
    assert.equal(air.enemy?.faction, "slug");
    assert.equal(air.fightEvent, "slug-hacker-choice");
    assert.equal(air.scrap, 10);

    const guns = createGame(3);
    open(guns);
    const gunsLead = `"Your acceptance of death is almosst admirable... Almosst." Your weapons system registers a hacking module. You hardly have time to respond before they attack.`;
    choose(guns, "c:slug-hacker-choice:2");
    assert.equal(guns.phase, "event");
    assert.equal(guns.event?.choices[0]?.id, "ship-resume");
    assert.equal(guns.event?.body, gunsLead);
    assert.equal(guns.log.includes(gunsLead), false);
    choose(guns, "ship-resume");
    assert.equal(guns.phase, "combat");
    assert.equal(guns.enemy?.faction, "slug");
    assert.equal(guns.fightEvent, "slug-hacker-choice");
    assert.equal(guns.scrap, 10);
  });
});

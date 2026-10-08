import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-choice";
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
    choose(shields, "c:slug-hacker-choice:0");
    assert.equal(shields.phase, "combat");
    assert.equal(shields.enemy?.faction, "slug");
    assert.equal(shields.fightEvent, "slug-hacker-choice");
    assert.equal(shields.scrap, 10);
    assert.equal(shields.player.shieldNow, 1);
    assert.ok(shields.log.includes(`"Very good then!" Your shield power suddenly drops and they charge.`));

    const air = createGame(2);
    open(air);
    choose(air, "c:slug-hacker-choice:1");
    assert.equal(air.phase, "combat");
    assert.equal(air.enemy?.faction, "slug");
    assert.equal(air.fightEvent, "slug-hacker-choice");
    assert.equal(air.scrap, 10);
    assert.ok(air.log.includes(`"A being that would choose sssuffocation? Who am I to judge..." Your life support shuts off and they move in to attack.`));

    const guns = createGame(3);
    open(guns);
    choose(guns, "c:slug-hacker-choice:2");
    assert.equal(guns.phase, "combat");
    assert.equal(guns.enemy?.faction, "slug");
    assert.equal(guns.fightEvent, "slug-hacker-choice");
    assert.equal(guns.scrap, 10);
    assert.ok(guns.log.includes(`"Your acceptance of death is almosst admirable... Almosst." Your weapons system registers a hacking module. You hardly have time to respond before they attack.`));
  });
});

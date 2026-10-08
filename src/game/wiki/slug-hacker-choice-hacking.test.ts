import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armSpike, launchSpike } from "../extras/spike.ts";
import { choiceDisabled, choose, createGame, playerHackingOff } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  `"Sssilence won't protect you. I'll make the choice mysself... Wait. Why isn't this working?" You cut transmission and move in to attack.`;

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

describe("Slug hacker (choice) hacking", () => {
  it("stays closed without Hacking", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-choice:4" && c.label === "Counter any hack attempt."));
    assert.equal(choiceDisabled(g, "c:slug-hacker-choice:4"), "Needs a Hacking system");
    choose(g, "c:slug-hacker-choice:4");
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
    open(g);
    assert.equal(choiceDisabled(g, "c:slug-hacker-choice:4"), null);
    choose(g, "c:slug-hacker-choice:4");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "slug-hacker-choice");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.kits.spike?.level, 1);
    assert.equal(playerHackingOff(g), true);
    const aimed = ["shields", "weapons", "oxygen", "engines"].some((id) => armSpike(g, id));
    assert.equal(aimed, true);
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, 2);
  });
});

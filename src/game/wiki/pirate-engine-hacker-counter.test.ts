import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armSpike, launchSpike } from "../extras/spike.ts";
import { choiceDisabled, choose, createGame, evasionPercent, playerHackingOff } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD = "Your Hacking System automatically counters the digital assault and you move in to fight the ship.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-engine-hacker";
  b.name = "Pirate engine hacker";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate engine hacker");
}

describe("Pirate engine hacker hacking counter", () => {
  it("stays closed without Hacking", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-engine-hacker:1" && c.label === "Counter the remote hacking."));
    assert.equal(choiceDisabled(g, "c:pirate-engine-hacker:1"), "Needs a Hacking system");
    choose(g, "c:pirate-engine-hacker:1");
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
  });

  it("shows the printed counter sentence, takes Hacking offline, and does not cap Engines", () => {
    const g = createGame(2);
    g.player.kits.spike = { id: "spike", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    g.player.parts = 2;
    g.player.systems.engines.level = 5;
    g.player.systems.engines.power = 5;
    g.player.systems.engines.damage = 0;
    open(g);
    assert.equal(choiceDisabled(g, "c:pirate-engine-hacker:1"), null);
    choose(g, "c:pirate-engine-hacker:1");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "pirate-engine-hacker");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.kits.spike?.level, 1);
    assert.equal(playerHackingOff(g), true);
    const aimed = ["shields", "weapons", "oxygen", "engines"].some((id) => armSpike(g, id));
    assert.equal(aimed, true);
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, 2);
    assert.equal(g.enemyEscape?.mode, "never");
    const high = evasionPercent(g, g.player, "player");
    g.player.systems.engines.level = 1;
    g.player.systems.engines.power = 1;
    const low = evasionPercent(g, g.player, "player");
    assert.ok(high > low, `${high} vs ${low}`);
  });
});

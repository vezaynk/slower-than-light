import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerEvent } from "./filler-events.ts";

const LEAD =
  "You find the Rebel ship hiding on a nearby asteroid. You are able to get a shot off and permanently disable their engines before they notice you.";
const PIN = "c:rebel-fight-chance:3";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-chance";
  b.name = "Rebel fight chance";
  g.here = b.id;
  g.event = citedEvent(g, b);
  if (!g.event) {
    b.flag = "filler:rebel-fight-chance";
    g.event = fillerEvent(g, b);
  }
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight chance");
}

describe("Rebel fight chance Advanced Sensors", () => {
  it("stays closed below Sensors level 3", () => {
    const g = createGame(1);
    g.player.systems.sensors.level = 2;
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === PIN && c.label === "Pinpoint the Rebel's location."));
    assert.equal(choiceDisabled(g, PIN), "Needs Sensors level 3");
    choose(g, PIN);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
  });

  it("Sensors level 3 disables the Rebel engines and starts the fight", () => {
    const g = createGame(2);
    g.player.systems.sensors.level = 3;
    open(g);
    assert.equal(choiceDisabled(g, PIN), null);
    choose(g, PIN);
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "rebel-fight-chance");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.scrap, 10);
    const engines = g.enemy?.systems.engines;
    assert.ok(engines);
    assert.ok(engines.level > 0);
    assert.equal(engines.damage, engines.level);
    assert.equal(engines.power, 0);
  });
});

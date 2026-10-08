import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerEvent } from "./filler-events.ts";

const LEAD = "You quickly find the rebel ship's location and move to intercept.";
const SCAN = "c:rebel-fight-chance:2";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-chance";
  b.name = "Rebel fight chance";
  g.here = b.id;
  g.event = citedEvent(g, b);
  // The card lives on the filler list, stamped filler:rebel-fight-chance. citedEvent does not list it.
  if (!g.event) {
    b.flag = "filler:rebel-fight-chance";
    g.event = fillerEvent(g, b);
  }
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight chance");
}

describe("Rebel fight chance Improved Sensors", () => {
  it("stays closed below Sensors level 2", () => {
    const g = createGame(1);
    g.player.systems.sensors.level = 1;
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === SCAN && c.label === "Perform a scan of the area."));
    assert.equal(choiceDisabled(g, SCAN), "Needs Sensors level 2");
    choose(g, SCAN);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
  });

  it("Sensors level 2 finds the rebel ship and starts the fight", () => {
    const g = createGame(2);
    g.player.systems.sensors.level = 2;
    open(g);
    assert.equal(choiceDisabled(g, SCAN), null);
    choose(g, SCAN);
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "rebel-fight-chance");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.scrap, 10);
  });
});

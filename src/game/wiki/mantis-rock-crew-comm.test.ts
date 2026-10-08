import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  "The two aliens face one another over the vidscreen. \"Cave-dwelling pebble-man!\" yells the furious Mantis captain. \"See, I paint my ship with your companions! I paint my ship with you!\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-with-rock-body-parts";
  b.name = "Mantis ship with Rock body parts";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship with Rock body parts");
}

describe("Mantis ship with Rock body parts Rock crew", () => {
  it("stays closed without a Rock crewmember", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-ship-with-rock-body-parts:2" && c.label === "Put your Rock crewmember on the comm."));
    assert.equal(choiceDisabled(g, "c:mantis-ship-with-rock-body-parts:2"), "Needs a Rock crewmember");
    choose(g, "c:mantis-ship-with-rock-body-parts:2");
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
  });

  it("putting a Rock on the comm shows the printed pebble-man sentence and starts a Mantis fight", () => {
    const g = createGame(2);
    const pilot = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(pilot);
    pilot.kin = "stone";
    open(g);
    assert.equal(choiceDisabled(g, "c:mantis-ship-with-rock-body-parts:2"), null);
    choose(g, "c:mantis-ship-with-rock-body-parts:2");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "mantis-ship-with-rock-body-parts");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.scrap, 10);
  });
});

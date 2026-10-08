import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystal-fight-choice";
  b.name = "Crystal fight choice";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crystal fight choice");
}

describe("Crystal fight choice engage", () => {
  it("engaging prints the obliteration sentence and starts a Crystal ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:crystal-fight-choice:0");
    assert.ok(g.log.includes("Before you can engage, the Crystalline ship scores a direct hit and obliterates the Rebel ship! They hail: \"You, you are like these other aliens! You brought them here!\" With that they turn their cannons on you!"));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "crystal-fight-choice");
    assert.equal(g.enemy?.faction, "crystal");
    assert.equal(g.scrap, 10);
  });
});

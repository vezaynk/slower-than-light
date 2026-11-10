import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ZOLTAN_DISTRESS_MANTIS";
  b.name = "Zoltan ship follows Mantis ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan ship follows Mantis ship");
}

describe("Zoltan ship follows Mantis ship save", () => {
  it("saving the Mantis shows the printed underdog sentence on the card and fights a Zoltan ship in the asteroid field", () => {
    // Wiki citations:
    // > "Sometimes you have to bet on the underdog - even on the rare occasions that the underdog is a Mantis warship. You set off for the heart of the asteroid field and engage the Zoltan there." — [[Zoltan ship follows Mantis ship]]
    // > "Fight a Zoltan ship." — [[Zoltan ship follows Mantis ship]]
    const g = createGame(1);
    open(g);
    const lead =
      "Sometimes you have to bet on the underdog - even on the rare occasions that the underdog is a Mantis warship. You set off for the heart of the asteroid field and engage the Zoltan there.";
    choose(g, "c:zoltan-ship-follows-mantis-ship:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "zoltan");
    assert.equal(g.fightEvent, "zoltan-ship-follows-mantis-ship");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
    assert.equal(g.log.includes(lead), false);
  });
});

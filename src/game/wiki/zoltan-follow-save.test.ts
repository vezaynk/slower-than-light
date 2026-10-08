import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-ship-follows-mantis-ship";
  b.name = "Zoltan ship follows Mantis ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan ship follows Mantis ship");
}

describe("Zoltan ship follows Mantis ship save", () => {
  it("saving the Mantis logs the printed underdog sentence and fights a Zoltan ship in the asteroid field", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-ship-follows-mantis-ship:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "zoltan");
    assert.equal(g.fightEvent, "zoltan-ship-follows-mantis-ship");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
    assert.ok(
      g.log.includes(
        "Sometimes you have to bet on the underdog - even on the rare occasions that the underdog is a Mantis warship. You set off for the heart of the asteroid field and engage the Zoltan there.",
      ),
    );
  });
});

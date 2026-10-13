import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kinOf } from "../extras/kin.ts";
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

describe("Zoltan ship follows Mantis ship help", () => {
  it("helping the Zoltan logs the printed friends sentence and fights an all-Mantis ship in the asteroid field", () => {
    const hp = kinOf("blade").hp;
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-ship-follows-mantis-ship:1");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.fightEvent, "zoltan-ship-follows-mantis-ship");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
    const theirs = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
    assert.ok(theirs.length > 0);
    assert.ok(theirs.every((c) => c.kin === "blade" && c.name === "Mantis" && c.hp === hp && c.maxHp === hp));
    assert.ok(
      g.log.includes(
        "You overtake the Zoltan and catch up with the Mantis ship in the asteroid belt. Time to make some friends.",
      ),
    );
  });
});

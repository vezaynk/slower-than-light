import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kinOf } from "../extras/kin.ts";
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

describe("Zoltan ship follows Mantis ship help", () => {
  it("helping the Zoltan shows the printed friends sentence on the card and fights an all-Mantis ship in the asteroid field", () => {
    // Wiki citations:
    // > "You overtake the Zoltan and catch up with the Mantis ship in the asteroid belt. Time to make some friends." — [[Zoltan ship follows Mantis ship]]
    // > "Fight a Mantis ship with crew entirely composed of Mantis." — [[Zoltan ship follows Mantis ship]]
    const hp = kinOf("mantis").hp;
    const g = createGame(1);
    open(g);
    const told =
      "You overtake the Zoltan and catch up with the Mantis ship in the asteroid belt. Time to make some friends.";
    choose(g, "c:zoltan-ship-follows-mantis-ship:1");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(told));
    assert.equal(g.log.includes(told), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.asteroid, true);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.fightEvent, "zoltan-ship-follows-mantis-ship");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
    assert.equal(g.log.includes(told), false);
    const theirs = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
    assert.ok(theirs.length > 0);
    assert.ok(
      theirs.every(
        (c) => c.kin === "mantis" && c.name === "Mantis" && c.hp === hp && c.maxHp === hp,
      ),
    );
  });
});

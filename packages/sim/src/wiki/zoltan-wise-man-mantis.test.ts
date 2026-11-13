import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kinOf } from "../extras/kin.ts";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ZOLTAN_RIFT_FIGHT";
  b.name = eventText("event_ZOLTAN_RIFT_SUCCESS_text");
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, eventText("event_ZOLTAN_RIFT_SUCCESS_text"));
}

describe("Zoltan wise man Mantis", () => {
  it("prints the challenge sentence and fights a Mantis ship whose crew are all Mantis", () => {
    const hp = kinOf("mantis").hp;
    const g = createGame(1);
    open(g);
    const told = eventText("event_ZOLTAN_RIFT_FIGHT_c1_text");
    choose(g, "c:zoltan-wise-man:0");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(told));
    assert.equal(g.log.includes(told), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "mantis");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.fightEvent, "zoltan-wise-man");
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

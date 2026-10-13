import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kinOf } from "../extras/kin.ts";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-wise-man";
  b.name = "Zoltan wise man";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan wise man");
}

describe("Zoltan wise man Mantis", () => {
  it("prints the challenge sentence and fights a Mantis ship whose crew are all Mantis", () => {
    const hp = kinOf("blade").hp;
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-wise-man:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.fightEvent, "zoltan-wise-man");
    assert.equal(g.scrap, 10);
    const theirs = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
    assert.ok(theirs.length > 0);
    assert.ok(theirs.every((c) => c.kin === "blade" && c.name === "Mantis" && c.hp === hp && c.maxHp === hp));
    assert.ok(
      g.log.includes(
        `"You like a challenge. So be it!" A wormhole forms and a confused, angry Mantis ship hurtles toward you!`,
      ),
    );
  });
});

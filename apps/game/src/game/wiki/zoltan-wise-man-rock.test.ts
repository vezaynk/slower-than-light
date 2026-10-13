import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

describe("Zoltan wise man Rockmen", () => {
  it("prints the veteran sentence and fights a Rock ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-wise-man:2");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.fightEvent, "zoltan-wise-man");
    assert.equal(g.scrap, 10);
    assert.ok(
      g.log.includes(
        `"A hardened foe for a hardened veteran." You detect a wormhole opening up, and a Rock ship appears with guns blazing. It appears they were in combat when they were thrust across space-time.`,
      ),
    );
  });
});

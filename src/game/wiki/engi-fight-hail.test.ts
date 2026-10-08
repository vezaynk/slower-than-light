import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You jump into a debris field that used to be a Zoltan cruiser. Unfortunately, its Engi escort takes you for the attacker and retaliates! They refuse all hails.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:engi-fight";
  b.name = "Engi fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Engi fight");
}

describe("Engi fight", () => {
  it("shows the printed intro, and the fight choice starts an Engi combat", () => {
    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    assert.equal(g.event?.body, BODY);
    choose(g, "c:engi-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "engi");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "engi-fight");
    assert.equal(g.scrap, 10);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
  });
});

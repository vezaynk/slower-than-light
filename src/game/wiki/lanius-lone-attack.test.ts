import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-lone-ship";
  b.name = "Lanius lone ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius lone ship");
}

describe("Lanius lone ship", () => {
  it("attacking prints the lead-in and starts a Lanius ship fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-lone-ship:0");
    assert.ok(g.log.includes("The civilian ship hastily retreats while you intercept the path of the ship and lock on weapons. It turns and prepares for a fight."));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-lone-ship");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.scrap, 10);
  });
});

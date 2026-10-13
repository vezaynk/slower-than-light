import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-in-rich-debris-field";
  b.name = "Lanius ship in rich debris field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship in rich debris field");
}

describe("Lanius ship in rich debris field harvest fight", () => {
  it("harvesting logs the printed lead-in and fights a Lanius ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-in-rich-debris-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-in-rich-debris-field");
    assert.equal(g.scrap, 10);
    assert.ok(g.log.includes("As you attempt to navigate the debris, you come too close to the Lanius ship - and they proceed to try to harvest you!"));
  });
});

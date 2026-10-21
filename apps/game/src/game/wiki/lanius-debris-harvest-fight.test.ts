import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_HARVESTER";
  b.name = "Lanius ship in rich debris field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship in rich debris field");
}

describe("Lanius ship in rich debris field harvest fight", () => {
  it("harvesting shows the printed lead-in on the card and fights a Lanius ship", () => {
    const g = createGame(1);
    open(g);
    const told =
      "As you attempt to navigate the debris, you come too close to the Lanius ship - and they proceed to try to harvest you!";
    choose(g, "c:lanius-ship-in-rich-debris-field:0");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(told));
    assert.equal(g.log.includes(told), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "lanius");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.fightEvent, "lanius-ship-in-rich-debris-field");
    assert.equal(g.scrap, 10);
    assert.equal(g.log.includes(told), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:federation-deserters";
  b.name = "Federation deserters";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Federation deserters");
}

describe("Federation deserters attack", () => {
  it("attacking logs the printed cowards sentence and fights a Federation ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:federation-deserters:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "federation");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "federation-deserters");
    assert.equal(g.scrap, 10);
    assert.ok(
      g.log.includes(
        "Deserters cannot be tolerated. You open fire on the cowards - though it doesn't please you to do so. The Federation needs every soldier it can get.",
      ),
    );
  });
});

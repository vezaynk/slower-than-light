import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const ID = "c:refueling-platform:1";
const LABEL = "Ignore the refueling platform.";
const BAIT = "As you prepare to leave the system, a Pirate ship suddenly appears on scanners - it looks like it was attempting to use the platform as bait!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:refueling-platform";
  b.name = "Refueling platform";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Refueling platform");
}

describe("Refueling platform ignore", () => {
  it("does nothing or starts the printed pirate-bait fight", () => {
    let nothing = 0;
    let fought = 0;
    for (let seed = 1; seed <= 80 && (nothing === 0 || fought === 0); seed++) {
      const g = createGame(seed);
      open(g);
      assert.ok(g.event?.choices.some((c) => c.id === ID && c.label === LABEL));
      const fuel = g.fuel;
      choose(g, ID);
      if (g.phase === "event") {
        nothing += 1;
        assert.equal(g.event?.body, "Nothing happens.");
        assert.equal(g.enemy, null);
        assert.equal(g.scrap, 10);
        assert.equal(g.fuel, fuel);
      } else {
        fought += 1;
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "refueling-platform");
        assert.equal(g.enemy?.pirate, true);
        assert.equal(g.scrap, 10);
        assert.equal(g.fuel, fuel);
        assert.ok(g.log.includes(BAIT));
      }
    }
    assert.ok(nothing > 0);
    assert.ok(fought > 0);
  });
});

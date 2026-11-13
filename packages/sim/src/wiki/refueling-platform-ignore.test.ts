import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const ID = "c:refueling-platform:1";
const LABEL = "Ignore the refueling platform.";
const BAIT =
  eventText("event_FUELING_STATION_IGNORE_1_text");

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "FUELING_STATION";
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
      const fighting =
        g.enemy != null && g.event?.choices.some((c) => c.id === "ship-resume") === true;
      if (fighting) {
        fought += 1;
        assert.equal(g.event?.body, BAIT);
        assert.equal(g.log.includes(BAIT), false);
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "refueling-platform");
        assert.equal(g.enemy?.pirate, true);
        assert.equal(g.scrap, 10);
        assert.equal(g.fuel, fuel);
      } else {
        nothing += 1;
        assert.equal(g.phase, "event");
        assert.equal(g.event?.body, "Nothing happens.");
        assert.equal(g.enemy, null);
        assert.equal(g.scrap, 10);
        assert.equal(g.fuel, fuel);
      }
    }
    assert.ok(nothing > 0);
    assert.ok(fought > 0);
  });
});

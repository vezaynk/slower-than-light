import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { EXTRA_EVENTS } from "./cited-events-zoltan.ts";

const BODY =
  "You spy two pirate ships lurking in the nebula here. They remain unaware of your presence; you're able to get your scanners to at least identify their cargo: One is carrying the fuel supplies, the other the ammunition. They begin to drift away from each other in the storm.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ships-in-plasma-storm";
  b.name = "Pirate ships in plasma storm";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Pirate ships in plasma storm hail", () => {
  it("prints the full italic and keeps the existing choices", () => {
    const g = createGame(1);
    open(g);
    const def = EXTRA_EVENTS.find((ev) => ev.flag === "cited:pirate-ships-in-plasma-storm");
    assert.ok(def);
    const ids = g.event?.choices.map((c) => c.id) ?? [];
    assert.equal(g.event?.title, "Pirate ships in plasma storm");
    assert.equal(g.event?.body, BODY);
    assert.equal(ids[0], "c:pirate-ships-in-plasma-storm:0");
    assert.deepEqual(
      ids,
      def.choices.map((c) => c.id),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
  });
});

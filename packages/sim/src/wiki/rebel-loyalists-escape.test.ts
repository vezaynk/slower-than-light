import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "REBEL_VS_FEDERATION";
  b.name = "Optional fight: Rebel ship and Federation ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Rebel ship and Federation ship");
}

describe("Optional fight: Rebel ship and Federation ship", () => {
  it("using this chance to escape spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-federation-loyalists:1");
    assert.equal(
      g.event?.body,
      [eventText("event_REBEL_VS_FEDERATION_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.notEqual(g.phase, "combat");
    assert.equal(g.scrap, 10);
  });
});

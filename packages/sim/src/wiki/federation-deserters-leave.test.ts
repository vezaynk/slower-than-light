import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "CRYSTAL_FED_DESERTER";
  b.name = "Supplies for map: Federation ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Supplies for map: Federation ship");
}

describe("Federation deserters leave", () => {
  it("leaving shows the printed warning sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:federation-deserters:1");
    assert.equal(
      g.event?.body,
      [eventText("event_CRYSTAL_FED_DESERTER_c3_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});

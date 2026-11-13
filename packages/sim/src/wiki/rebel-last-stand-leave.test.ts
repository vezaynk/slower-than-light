import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "BOSS_SCOUT_RESCUE";
  b.name = "Optional fight: Rebel ship (Last Stand)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Rebel ship (Last Stand)");
}

describe("Rebel ship attacking civilians in Last Stand leave", () => {
  it("getting ready to jump shows the printed horrors sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    const scrap = g.scrap;
    choose(g, "c:rebel-ship-attacking-civilians-in-last-stand:1");
    assert.equal(
      g.event?.body,
      [eventText("event_BOSS_SCOUT_RESCUE_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, scrap);
    assert.equal(g.enemy, null);
  });
});

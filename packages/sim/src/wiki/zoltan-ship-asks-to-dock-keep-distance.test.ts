import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ZOLTAN_SCIENCE_DOCK";
  b.name = "Docking request: Zoltan ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Docking request: Zoltan ship");
}

describe("Zoltan ship asks to dock keep distance", () => {
  it("keeping their distance shows the printed leave sentence and nothing happens", () => {
    const g = createGame(1);
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    g.fleet = 5;
    choose(g, "c:zoltan-ship-asks-to-dock:1");
    assert.equal(g.event?.body, [eventText("event_LANIUS_TRADER_c2_text"), "Nothing happens."].join("\n\n"));
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ENGI_UNLOCK_1";
  b.name = "Engi fleet discussion";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Engi fleet discussion");
}

describe("Engi fleet discussion ignore", () => {
  it("ignoring the fleet shows the printed wonder sentence and nothing happens", () => {
    // Wiki citations:
    // > "Ignore it and move on." — [[Engi fleet discussion]]
    // > "You can't help but wonder what they were discussing as you prepare to jump." — [[Engi fleet discussion]]
    const g = createGame(1);
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    g.fleet = 5;
    choose(g, "c:engi-fleet-discussion:1");
    assert.equal(
      g.event?.body,
      [eventText("event_ENGI_UNLOCK_1_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });
});

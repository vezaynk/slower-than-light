import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "NEBULA_PIRATE_SMUGGLE";
  b.name = "Pirate smuggler";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate smuggler");
}

describe("Pirate smuggler ignore", () => {
  it("ignoring the ship shows the printed jump sentence and nothing happens", () => {
    // Wiki citations:
    // > "Ignore the ship." — [[Pirate smuggler]]
    // > "It jumps away after a time." — [[Pirate smuggler]]
    // > "Nothing happens." — [[Pirate smuggler]]
    const g = createGame(1);
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    g.fleet = 5;
    choose(g, "c:pirate-smuggler:1");
    assert.equal(g.event?.body, "It jumps away after a time.\n\nNothing happens.");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });
});

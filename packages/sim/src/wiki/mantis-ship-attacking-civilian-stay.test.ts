import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const STAY = [
  eventText("text_MANTIS_CIVILIAN_AVOID_1"),
  eventText("text_MANTIS_CIVILIAN_AVOID_2"),
  eventText("text_MANTIS_CIVILIAN_AVOID_3"),
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "MANTIS_CIVILIAN";
  b.name = "Mantis ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship attacking civilian");
}

describe("Mantis ship attacking civilian stay out", () => {
  it("shows one of three sentences and nothing happens, with no odds", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const g = createGame(seed);
      open(g);
      assert.equal(g.scrap, 10);
      choose(g, "c:mantis-ship-attacking-civilian:1");
      const body = g.event?.body ?? "";
      const line = STAY.find((s) => body.startsWith(s));
      assert.ok(line, body);
      assert.equal(body, `${line}\n\nNothing happens.`);
      assert.equal(g.scrap, 10);
      assert.notEqual(g.phase, "combat");
      assert.equal(g.phase, "event");
      seen.add(line);
    }
    // The stand-in may print one line for all three.
    assert.equal(seen.size, new Set(STAY).size);
  });
});

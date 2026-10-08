import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const STAY = [
  "Smoking, the civilian ship limps on. You set your sights on the future.",
  "The noise of the FTL spinning up almost drowns out the explosions. Almost.",
  "You let them pass and try not to think about it.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-attacking-civilian";
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
    assert.equal(seen.size, STAY.length);
  });
});

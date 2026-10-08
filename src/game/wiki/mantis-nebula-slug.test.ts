import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "The Mantis attack ship here looks to have been hunting Slugs on their home turf - a rare test of honor for the mightiest Mantis crews. Weapons up!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.kind = "event";
  b.flag = "cited:mantis-fight-in-nebula-slug";
  b.name = "Mantis fight in nebula (Slug)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  return b;
}

describe("Mantis fight in nebula (Slug)", () => {
  it("shows the printed sentence, including Weapons up", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-fight-in-nebula-slug:0"));
  });
});

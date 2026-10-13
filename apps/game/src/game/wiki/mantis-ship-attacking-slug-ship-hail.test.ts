import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  'The distress call appears to be emanating from a Slug ship caught in open space by a Mantis raider. They contact you on emergency frequencies: "Please, we\'ll give you all we have if you sssave ussss!"';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-attacking-slug-ship";
  b.name = "Mantis ship attacking Slug ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis ship attacking Slug ship hail", () => {
  it("prints the full distress sentence and the three choices without spending scrap", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Mantis ship attacking Slug ship");
    assert.equal(g.event?.body, HAIL);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      [
        "c:mantis-ship-attacking-slug-ship:0",
        "c:mantis-ship-attacking-slug-ship:1",
        "c:mantis-ship-attacking-slug-ship:2",
      ],
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
  });
});

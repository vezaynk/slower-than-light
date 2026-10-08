import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  "A Zoltan academy sits docked just outside the beacon perimeter. They're happy to show you the fruits of their labor, and offer something to take home with you.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-free-augment";
  b.name = "Zoltan free augment";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Zoltan free augment hail", () => {
  it("prints the full opening and leaves the unnamed augment ungranted", () => {
    const g = createGame(1);
    const augments = g.augments.length;
    open(g);
    assert.equal(g.event?.title, "Zoltan free augment");
    assert.equal(g.event?.body, HAIL);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:zoltan-free-augment:0"],
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.augments.length, augments);
  });
});

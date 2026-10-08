import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY = "The Mantis ship in this system looks like its distress beacon is malfunctioning... likely due to the Lanius ship mining their hull and sub-systems! It doesn't look like the Mantis ship will last much longer.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-attacking-mantis";
  b.name = "Lanius ship attacking Mantis";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Lanius ship attacking Mantis body", () => {
  it("shows the printed distress sentence before the choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Lanius ship attacking Mantis");
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-attacking-mantis:0"));
    assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-attacking-mantis:1"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  'You arrive at a Zoltan security checkpoint set up in a perimeter around the beacon. "Traveling vessel, you will submit to crew profiling to identify fugitives of the empire."';

describe("Zoltan security checkpoint intro", () => {
  it("prints the hail with the checkpoint sentence", () => {
    const g = createGame(1);
    const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
    assert.ok(b);
    b.flag = "cited:zoltan-security-checkpoint";
    b.name = "Zoltan security checkpoint";
    g.here = b.id;
    g.event = citedEvent(g, b);
    g.phase = "event";
    assert.equal(g.event?.body, BODY);
    assert.equal(g.event?.choices[0]?.id, "c:zoltan-security-checkpoint:0");
  });
});

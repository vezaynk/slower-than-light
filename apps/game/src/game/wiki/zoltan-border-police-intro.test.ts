import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "There are few more zealous in their customs checks than the Zoltan. A team of border police beam on board. There's just a little confusion over your weapons licences, but things escalate rapidly from heated discussion to gunfire!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-border-police";
  b.name = "Zoltan border police";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan border police");
}

describe("Zoltan border police intro", () => {
  it("prints the full customs-check italic and keeps the Zoltan fight choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.equal(g.event?.choices[0]?.id, "c:zoltan-border-police:0");
  });
});

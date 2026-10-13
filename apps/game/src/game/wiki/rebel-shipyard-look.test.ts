import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const WARNING =
  "Warning lights flash as scans identify the gigantic ship under construction - it's a second Rebel Flagship! This must be the secret shipyards where the first one was built, and you've accidentally stumbled across it! Even in its weakened state, the Rebel ship powers up... get ready, you've got a hell of a fight on your hands!";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-shipyard";
  b.name = "Rebel shipyard";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rebel shipyard look around", () => {
  it("logs the printed warning and fights the second Flagship", () => {
    const g = createGame(1);
    open(g);
    const scrap = g.scrap;
    choose(g, "c:rebel-shipyard:0");
    assert.equal(g.phase, "combat");
    assert.ok(g.log.includes(WARNING));
    assert.ok(g.enemy?.flagship);
    assert.equal(g.fightEvent, "rebel-shipyard");
    assert.equal(g.scrap, scrap);
    assert.equal(g.unlocked, undefined);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const WARNING = eventText("event_FLAGSHIP_CONSTRUCTION_c1_text");

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "FLAGSHIP_CONSTRUCTION";
  b.name = "Optional fight: second flagship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rebel shipyard look around", () => {
  it("shows the printed warning and fights the second Flagship", () => {
    const g = createGame(1);
    open(g);
    const scrap = g.scrap;
    choose(g, "c:rebel-shipyard:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, WARNING);
    assert.equal(g.log.includes(WARNING), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy?.flagship);
    assert.equal(g.fightEvent, "rebel-shipyard");
    assert.equal(g.scrap, scrap);
    assert.equal(g.unlocked, undefined);
  });
});

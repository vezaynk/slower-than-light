import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ENGI_SEX";
  b.name = "Engi smashed ships";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Engi smashed ships");
}

const LEAD =
  "To your surprise, one of the Engi vessels attacks! One ship detaches itself, surprisingly still quite whole, and opens fire - it looks like it's somehow identified you as hostile!";

describe("Engi smashed ships pry", () => {
  it("shows the hostile sentence on the continue card and fights an Engi ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:engi-smashed-ships:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, LEAD);
    assert.equal(g.log.includes(LEAD), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.enemy?.faction, "engi");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "engi");
    assert.equal(g.fightEvent, "engi-smashed-ships");
    assert.equal(g.scrap, 10);
  });
});

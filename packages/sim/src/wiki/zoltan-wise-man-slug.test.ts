import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ZOLTAN_RIFT_FIGHT";
  b.name = "Choose your fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Choose your fight");
}

describe("Zoltan wise man Slug", () => {
  it("prints the lead-in and fights a Slug ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-wise-man:1");
    const lead = `"Do not be fooled, Federation, by a soft underbelly." You detect a wormhole opening up, and seconds later a Slug ship is attacking from the other direction!`;
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.fightEvent, "zoltan-wise-man");
    assert.equal(g.scrap, 10);
  });
});

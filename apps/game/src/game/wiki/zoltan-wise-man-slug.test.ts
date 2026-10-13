import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-wise-man";
  b.name = "Zoltan wise man";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan wise man");
}

describe("Zoltan wise man Slug", () => {
  it("prints the lead-in and fights a Slug ship", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-wise-man:1");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.fightEvent, "zoltan-wise-man");
    assert.equal(g.scrap, 10);
    assert.ok(
      g.log.includes(
        `"Do not be fooled, Federation, by a soft underbelly." You detect a wormhole opening up, and seconds later a Slug ship is attacking from the other direction!`,
      ),
    );
  });
});

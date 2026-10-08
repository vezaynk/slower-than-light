import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `You immediately receive a message upon arrival, "Help! These metal bastards have gone crazy!" The communication originates from the hull of a partially dismantled ship which lies among a number of other destroyed ships. The violent Lanius ship responsible for this carnage is advancing on the survivors.`,
  "You scan the area after arriving at this system. A Lanius ship is in fast pursuit of an unarmed civilian ship. It's hard to say if it's truly a threat since its weapons are not charging.",
  "You arrive at the location of a recent battle. Judging from the debris, some settlers attempted to fight off a number of small Lanius ships, although it's impossible to say who instigated the aggression. A few skirmishes can be seen in the distance, but more notably a lone Lanius ship is firing on a heavily damaged civilian vessel.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-attacking-civilian";
  b.name = "Lanius ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking civilian");
}

describe("Lanius ship attacking civilian intro", () => {
  it("shows one of the three printed intros, then fights a Lanius ship", () => {
    assert.equal(INTROS.length, 3);
    assert.equal(new Set(INTROS).size, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-attacking-civilian:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-ship-attacking-civilian:1"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian");
    assert.equal(g.scrap, 10);
  });
});

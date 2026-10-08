import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `You discover an abandoned mining facility in the process of being 'acquired' by the Lanius. However, you immediately receive a call from a civilian transport vessel, "Help! We were trying to escape before the Lanius came only to be caught by pirates!" You see a lone pirate ship boarding the civilian craft.`,
  "A pirate ship emerges from hiding after you and another ship jump into the area. Sensors show the pirates ran a quick scan of your ship's weapon system before flying off to pursue the unarmed civilian ship.",
  `A pirate ship is firing on the small ships docked at a refueling station. They are broadcasting on a wide band channel. You catch the captain's rant mid-speed, "...saw you trading with those damned scavengers. I'll show you what happens when you try and undercut the Red Giant gang!"`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-civilian-lanius";
  b.name = "Pirate ship attacking civilian (Lanius)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship attacking civilian (Lanius)");
}

describe("Pirate ship attacking civilian (Lanius) intro", () => {
  it("shows one of the three printed intros, then attacks or avoids", () => {
    assert.equal(INTROS.length, 3);
    assert.equal(new Set(INTROS).size, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian-lanius:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian-lanius:1"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian-lanius:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian-lanius");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);

    const stay = createGame(1);
    open(stay);
    choose(stay, "c:pirate-ship-attacking-civilian-lanius:1");
    assert.equal(stay.phase, "map");
    assert.equal(stay.scrap, 10);
  });
});

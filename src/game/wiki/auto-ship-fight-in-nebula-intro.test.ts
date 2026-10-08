import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You cross paths with an advance scout of the Rebel fleet searching this section of the nebula for your ship.",
  "You jump into a calmer part of the nebula. However, your relief fades as a Rebel scout jumps to the beacon and moves in to attack.",
  "The tangled wrecks of many ships wait in dormancy here. You see lights flicker on what looks like debris. A Rebel scout bursts out of the wreckage!",
  "This drone isn't looking for you. Perhaps it's scouting ahead for the Rebel expansion or maybe they're seeking to use this nebula for cover. Regardless, it identifies you as hostile.",
  "It's worrying that the Rebels have penetrated so deep into uncharted space, even if it is only an unmanned craft. It arms its weapons; you should do the same.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-fight-in-nebula";
  b.name = "Auto-ship fight in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship fight in nebula");
}

describe("Auto-ship fight in nebula intro", () => {
  it("shows one of the five printed intros, then fights an Auto-ship", () => {
    assert.equal(INTROS.length, 5);
    assert.equal(new Set(INTROS).size, 5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:auto-ship-fight-in-nebula:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-fight-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.fightEvent, "auto-ship-fight-in-nebula");
    assert.equal(g.scrap, 10);
  });
});

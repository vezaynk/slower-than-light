import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `You intercept discussions between a Rebel patrol and a human mining colony, "...we realize you're scared but all reports indicate the metal bastards target abandoned settlements only. If we relocated our fleets based on every request from backwater... wait, what's that..." Before you can react, the channel is cut and the Rebel ship moves in to attack.`,
  `You arrive to see a number of Rebel ships attempting to dissuade Lanius scavenger ships from "acquiring" their forward station. A passing Rebel patrol ship spots you and moves in to intercept.`,
  `A Rebel scout patrols near the beacon. "Hah! I knew you would try to sneak through this sector as soon as I heard it had become treacherous. Surrender!"`,
  "You arrive at the beacon and notice a small Rebel ship chasing Lanius scavengers away from a wrecked Rebel battleship. As soon as the Rebel notices you and moves in to attack, the Lanius ships return to their prey like flies on garbage.",
  `A Rebel messages you. "Who would have thought the most wanted ship in the quadrant would just happen by my station? Prepare to meet your maker."`,
  "Your arrival coincides almost exactly with that of a Rebel ship. It's hard to know who is more surprised, but there is no option but to fight.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-lanius";
  b.name = "Rebel fight (Lanius)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight (Lanius)");
}

describe("Rebel fight (Lanius)", () => {
  it("shows one of the six intros, and the fight choice starts a Rebel ship combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 120 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-lanius:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-fight-lanius:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-lanius");
    assert.equal(g.scrap, 10);
  });
});

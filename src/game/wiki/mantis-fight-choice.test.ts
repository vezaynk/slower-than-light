import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You're greeted by a rare sight: a Mantis ship that appears not to have noticed you.",
  "For once, you see the Mantis before they see you.",
  "When they see the Mantis warship waiting in ambush at your intended coordinates, your crew is relieved to note you've jumped someway off the mark.",
  `You overhear Mantis comm chatter: "Negative, I have killed more humans!" You gulp noticeably, but luckily they don't see you yet.`,
  `You overhear Mantis comm chatter: "The one on the right is starting to rot. Take him down. Take off his fingers. Put him out of the airlock." They certainly don't seem to be friendly...`,
  `You overhear Mantis comm chatter: "Agreed. Next ship is your turn. Good hunting." They don't see you yet.`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fight-choice";
  b.name = "Mantis fight choice";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis fight choice");
}

describe("Mantis fight choice", () => {
  it("shows one of the six printed intros, then attacks a Mantis ship", () => {
    assert.equal(INTROS.length, 6);
    assert.equal(new Set(INTROS).size, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-fight-choice:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:mantis-fight-choice:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-choice");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

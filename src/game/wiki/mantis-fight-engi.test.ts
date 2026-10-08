import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "A mixed radar signal turns out to be a Mantis attack ship scavenging the remains of an Engi carrier. They turn and fight.",
  "You come across a Mantis raider taking pot shots at a defenceless Engi supply station. Discovering its weapons aren't much of a match for the station's armour, it turns on your ship. Battle stations!",
  "The area looks clear, and you prepare to jump off, but a Mantis scout jumps in behind you! They're as surprised as you are, but their weapons are already online.",
  "You find a Mantis ship harrying a small squad of Engi. They make it to the node and jump off, leaving you toe to toe with their pursuer!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fight-engi";
  b.name = "Mantis fight (Engi)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis fight (Engi)");
}

describe("Mantis fight (Engi)", () => {
  it("shows one of the four printed intros, then fights a Mantis ship", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-fight-engi:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:mantis-fight-engi:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-engi");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

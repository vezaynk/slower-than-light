import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent } from "./filler-events.ts";

const INTROS = [
  `You arrive at a beacon located in a civilian star system. A nearby colony contacts you: "We've got a rogue Rebel ship harassing this system. Do you have time to find it?"`,
  `As soon as you arrive, you receive a Federation encrypted message: "A Rebel ship has been terrorizing the local civilians in this system, please seek and destroy it."`,
  "You begin charging your FTL drive, and do a quick scan of a local planet. You find the ruins of a recently destroyed federation colony on the surface. There must be a Rebel ship in the vicinity...",
  `You jump into a field of debris. It appears a battle recently took place here, and the loser seems to have been a civilian ship. A message was left on repeat before it was destroyed: "Rebels attacking, please send aid!" The responsible Rebels are likely still nearby.`,
];

function open(g: Game) {
  const b: Beacon = {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Rebel fight chance",
    tier: "",
    flag: "filler:rebel-fight-chance",
    asteroid: false,
  };
  g.beacons = [b];
  g.here = "b";
  g.event = fillerEvent(g, b);
  g.phase = "event";
}

describe("Rebel fight chance intros", () => {
  it("shows one of the four printed opening intros and keeps the four choices", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      const ids = (g.event?.choices ?? []).map((c) => c.id);
      assert.deepEqual(ids, [
        "c:rebel-fight-chance:0",
        "c:rebel-fight-chance:1",
        "c:rebel-fight-chance:2",
        "c:rebel-fight-chance:3",
      ]);
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);
  });
});

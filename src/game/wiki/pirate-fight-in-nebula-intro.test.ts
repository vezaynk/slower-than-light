import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "As you drift through the nebula an unmarked vessel descends from the clouds and into your wake. Their weapons come online.",
  `A pirate ship pulls out of the ether and hails: "You know what I love about this part of the galaxy? The explorers! You always carry such fine loot." They lock weapons.`,
  "As you coast through the nebula a pirate ship matches your course and closes the distance. Better to pick your battleground, but beggars can't be choosers.",
  "A hostile vessel descends from out of the nebula. Combat stations!",
  "You try to read the ID of a ship ahead in the fog, but it's too thick to penetrate. You have your answer when the ship turns, weapons hot!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight-in-nebula";
  b.name = "Pirate fight in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight in nebula");
}

describe("Pirate fight in nebula intro", () => {
  it("shows one of the five printed intros, then fights a pirate ship", () => {
    assert.equal(INTROS.length, 5);
    assert.equal(new Set(INTROS).size, 5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-in-nebula:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-fight-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-in-nebula");
    assert.equal(g.scrap, 10);
  });
});

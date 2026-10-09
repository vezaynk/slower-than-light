import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
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

  it("starts the Pirate ship on arrival and leaves no button", () => {
    // The page has no choice. One of the five printed intros, then "Fight a Pirate ship." nebula=true. unique=false. No nebula environment is added.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:pirate-fight-in-nebula";
    dest.name = "Pirate fight in nebula";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-in-nebula");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Your sensors are no match for the Slug's telepathic abilities - a ship you never even saw opens fire from astern!",
  "The Slug vessel you encounter here has obviously made a big score and is looking to test its new armaments. They picked the wrong ship to attack.",
  `A Slug passenger ship hails: "Please, your worthy alien highnessesss, we are unarmed and sseeking asssylum." You approach cautiously, and weapons immediately spring from their hull!`,
  "A Slug ship - a rogue, you suspect - approaches, but when he sees you're Federation he thinks better of the sneak attack and fires everything he has.",
  "Direct attacks are not preferred by the Slugs, but of the three you see at this beacon, one has the brass to make a move on your position!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-fight-in-nebula";
  b.name = "Slug fight in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug fight in nebula");
}

describe("Slug fight in nebula intro", () => {
  it("shows one of the five printed intros, then fights a Slug ship", () => {
    assert.equal(INTROS.length, 5);
    assert.equal(new Set(INTROS).size, 5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:slug-fight-in-nebula:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:slug-fight-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "slug-fight-in-nebula");
    assert.equal(g.scrap, 10);
  });

  it("starts the Slug ship on arrival and leaves no button", () => {
    // The page has no choice. One of the five printed intros, then "Fight a Slug ship." nebula=true. unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:slug-fight-in-nebula";
    dest.name = "Slug fight in nebula";
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
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "slug-fight-in-nebula");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

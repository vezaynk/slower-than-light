import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Hostile Rebel ship.",
  "Hostile Rebel ship.",
  "Hostile Rebel ship.",
  "Hostile Rebel ship.",
  "Hostile Rebel ship.",
  "Hostile Rebel ship.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "BOSS_FLEETS_BOTH_FIGHT";
  b.name = "Rebel fight among Federation and Rebel fleets";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight among Federation and Rebel fleets");
}

describe("Rebel fight among Federation and Rebel fleets intro", () => {
  it("shows one of the six printed intros, then fights a Rebel ship", () => {
    assert.equal(INTROS.length, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(
        g.event?.choices.some((c) => c.id === "c:rebel-fight-among-federation-and-rebel-fleets:0"),
      );
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-fight-among-federation-and-rebel-fleets:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-among-federation-and-rebel-fleets");
    assert.equal(g.scrap, 10);
  });

  it("starts the Rebel ship on arrival from the intro card", () => {
    // The page has no choice. One of the six printed intros, then "Fight a Rebel ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "BOSS_FLEETS_BOTH_FIGHT";
    dest.name = "Rebel fight among Federation and Rebel fleets";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.sectorId = "FINAL";
    g.sectorName = "The Last Stand";
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    const intro = g.event?.body ?? "";
    assert.equal(g.phase, "event");
    assert.ok(INTROS.includes(intro), intro);
    assert.equal(g.log.includes(intro), false);
    assert.equal(g.event?.choices[0]?.id, "c:rebel-fight-among-federation-and-rebel-fleets:0");
    choose(g, "c:rebel-fight-among-federation-and-rebel-fleets:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.event, null);
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-among-federation-and-rebel-fleets");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.equal(g.log.includes(intro), false);
  });
});

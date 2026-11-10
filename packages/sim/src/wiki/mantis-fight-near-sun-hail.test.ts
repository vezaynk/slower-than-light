import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "Who knows why the Mantis would venture so close to a sun. Perhaps it makes for more of a challenge?";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "MANTIS_SUN_FIGHT";
  b.name = "Mantis fight near sun";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis fight near sun", () => {
  it("prints the full opening sentence, then fights a Mantis ship", () => {
    // Wiki citations:
    // > "Who knows why the Mantis would venture so close to a sun. Perhaps it makes for more of a challenge?" — [[Mantis fight near sun]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight near sun]]
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Mantis fight near sun");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.scrap, 10);
    choose(g, "c:mantis-fight-near-sun:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-near-sun");
    assert.equal(g.scrap, 10);
  });

  it("shows the sun intro card on arrival, then the Mantis fight", () => {
    // Wiki citations:
    // > "Who knows why the Mantis would venture so close to a sun. Perhaps it makes for more of a challenge?" — [[Mantis fight near sun]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight near sun]]
    // The page has no choice. The printed sentence, then "Fight a Mantis ship." redgiant=true. unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "MANTIS_SUN_FIGHT";
    dest.name = "Mantis fight near sun";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.log.includes(BODY), false);
    assert.equal(g.event?.choices[0]?.id, "c:mantis-fight-near-sun:0");
    choose(g, "c:mantis-fight-near-sun:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.event, null);
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.flare, true);
    assert.equal(g.fightEvent, "mantis-fight-near-sun");
    assert.equal(g.fleet, 1);
    assert.equal(g.log.includes(BODY), false);
  });
});

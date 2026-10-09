import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const HAIL =
  'You are immediately hailed by an impressive-looking Mantis ship, "Your ship would make a mighty fine prize. Prepare for battle!"';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-collectors";
  b.name = "Mantis ship-collectors";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis ship-collectors hail", () => {
  it("prints the full opening sentence, then fights a Mantis Fighter", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Mantis ship-collectors");
    assert.equal(g.event?.body, HAIL);
    choose(g, "c:mantis-ship-collectors:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "mantis-ship-collectors");
    assert.equal(g.scrap, 10);
  });

  it("starts the Mantis Fighter on arrival and leaves no button", () => {
    // The page has no choice before the fight. The printed hail, then "Fight a Mantis Fighter." unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:mantis-ship-collectors";
    dest.name = "Mantis ship-collectors";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.sectorName = "Mantis Homeworlds";
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.fightEvent, "mantis-ship-collectors");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes(HAIL));
    const enemyCrew = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
    assert.ok(enemyCrew.length > 0);
    assert.ok(enemyCrew.every((c) => c.kin === "blade"));
  });
});

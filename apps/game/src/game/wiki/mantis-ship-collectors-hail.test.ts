import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageCard } from "./surrender.ts";

const HAIL =
  'You are immediately hailed by an impressive-looking Mantis ship, "Your ship would make a mighty fine prize. Prepare for battle!"';

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "DONOR_MANTIS_CHASE";
  b.name = "Mantis ship-collectors";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis ship-collectors hail", () => {
  it("prints the full opening sentence, then fights a Mantis Fighter", () => {
    // Wiki citations:
    // > "You are immediately hailed by an impressive-looking Mantis ship, \"Your ship would make a mighty fine prize. Prepare for battle!\"" — [[Mantis ship-collectors]]
    // > "Fight a Mantis Fighter with crew entirely composed of Mantis." — [[Mantis ship-collectors]]
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Mantis ship-collectors");
    assert.equal(g.event?.body, HAIL);
    choose(g, "c:mantis-ship-collectors:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "mantis-ship-collectors");
    assert.equal(g.scrap, 10);
  });

  it("shows the hail card, then the Mantis Fighter", () => {
    // Wiki citations:
    // > "You are immediately hailed by an impressive-looking Mantis ship, \"Your ship would make a mighty fine prize. Prepare for battle!\"" — [[Mantis ship-collectors]]
    // > "Fight a Mantis Fighter with crew entirely composed of Mantis." — [[Mantis ship-collectors]]
    // The page has no choice before the fight. The printed hail, then "Fight a Mantis Fighter." unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "DONOR_MANTIS_CHASE";
    dest.name = "Mantis ship-collectors";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.sectorId = "MANTIS_HOME";
    g.sectorName = "Mantis Homeworlds";
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, HAIL);
    assert.equal(g.log.includes(HAIL), false);
    assert.equal(g.event?.choices[0]?.id, "c:mantis-ship-collectors:0");
    assert.equal(g.fleet, 1);
    choose(g, "c:mantis-ship-collectors:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.fightEvent, "mantis-ship-collectors");
    assert.equal(g.flare, false);
    assert.equal(g.log.includes(HAIL), false);
    const enemyCrew = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
    assert.ok(enemyCrew.length > 0);
    assert.ok(enemyCrew.every((c) => c.kin === "mantis"));
  });

  it("a surrender-only collectors page still offers a way off the beacon", () => {
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "quest-mantis-chase";
    dest.name = "Quest stub";
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
    assert.equal(g.event?.title, "Mantis ship-collectors");
    assert.ok((g.event?.choices.length ?? 0) > 0);
    assert.equal(g.event?.choices[0]?.id, "ack");
    choose(g, "ack");
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
  });

  it("puts the Mantis Fighter button back when the collectors card is born empty", () => {
    const g = createGame(1);
    const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
    assert.ok(b);
    b.flag = "DONOR_MANTIS_CHASE";
    b.name = "Mantis ship-collectors";
    g.here = b.id;
    g.phase = "map";
    g.event = null;
    pageCard(g, "", []);
    assert.equal(g.event?.body, HAIL);
    assert.equal(g.event?.choices[0]?.id, "c:mantis-ship-collectors:0");
  });
});

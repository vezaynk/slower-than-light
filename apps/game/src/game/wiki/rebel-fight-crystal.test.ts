import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "As soon as you arrive, a Rebel ship jumps in after you; they must be really hot on your tail.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "CRYSTAL_REBEL";
  b.name = "Rebel fight (Crystal)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight (Crystal)");
}

describe("Rebel fight (Crystal)", () => {
  it("shows the printed sentence, and the fight choice starts a Rebel combat", () => {
    // Wiki citations:
    // > "As soon as you arrive, a Rebel ship jumps in after you; they must be really hot on your tail." — [[Rebel fight (Crystal)]]
    // > "Fight a Rebel ship (default rewards)." — [[Rebel fight (Crystal)]]
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-crystal:0"));
    choose(g, "c:rebel-fight-crystal:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-crystal");
    assert.equal(g.scrap, 10);
  });

  it("shows the Rebel intro card on arrival", () => {
    // Wiki citations:
    // > "As soon as you arrive, a Rebel ship jumps in after you; they must be really hot on your tail." — [[Rebel fight (Crystal)]]
    // > "Fight a Rebel ship (default rewards)." — [[Rebel fight (Crystal)]]
    // The page has no choice. The printed sentence, then "Fight a Rebel ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "CRYSTAL_REBEL";
    dest.name = "Rebel fight (Crystal)";
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
    assert.equal(g.event?.choices[0]?.id, "c:rebel-fight-crystal:0");
    choose(g, "c:rebel-fight-crystal:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.event, null);
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-crystal");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.equal(g.log.includes(BODY), false);
  });
});

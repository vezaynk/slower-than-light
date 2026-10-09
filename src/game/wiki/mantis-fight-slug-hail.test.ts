import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You intercept comm chatter from an incoming Mantis ship. \"Look. This ship appears not to be owned by the squishy ones. Maybe they won't smell so bad when we cut them open.\" They move in on your position.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fight-slug";
  b.name = "Mantis fight (Slug)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis fight (Slug) hail", () => {
  it("prints the full opening sentence, then fights a Mantis ship", () => {
    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    assert.equal(g.event?.title, "Mantis fight (Slug)");
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-fight-slug:0"));
    choose(g, "c:mantis-fight-slug:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-slug");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });

  it("starts the Mantis ship on arrival and leaves no button", () => {
    // The page has no choice. The printed sentence, then "Fight a Mantis ship." unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:mantis-fight-slug";
    dest.name = "Mantis fight (Slug)";
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
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-slug");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes(BODY));
  });
});

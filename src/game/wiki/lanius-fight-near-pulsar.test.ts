import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "There appears to be some sort of research station near a pulsar, although it's hard to tell since a portion of it has been melted. The Lanius ship that has been working at it moves in to intercept you, totally oblivious to the threat of EM pulses.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-fight-near-pulsar";
  b.name = "Lanius fight near pulsar";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius fight near pulsar");
  assert.equal(g.event?.body, BODY);
}

describe("Lanius fight near pulsar", () => {
  it("shows the printed intro, and the fight choice starts a Lanius combat near a pulsar", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:lanius-fight-near-pulsar:0"), true);
    choose(g, "c:lanius-fight-near-pulsar:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-fight-near-pulsar");
    assert.equal(g.pulsar, true);
    assert.equal(g.scrap, 10);
  });

  it("starts the Lanius ship beside a pulsar on arrival and leaves no button", () => {
    // The page has no choice. The printed sentence, then "Fight a Lanius ship." pulsar=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:lanius-fight-near-pulsar";
    dest.name = "Lanius fight near pulsar";
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
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.pulsar, true);
    assert.equal(g.flare, false);
    assert.equal(g.fightEvent, "lanius-fight-near-pulsar");
    assert.equal(g.fleet, 1);
    assert.ok(g.log.includes(BODY));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
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
});

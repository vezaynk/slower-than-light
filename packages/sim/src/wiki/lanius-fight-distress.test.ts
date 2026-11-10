import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You are too late - whatever once was emitting the distress signal from this system drew a Lanius ship as well as your own. Having consumed the original target, the Lanius turn their attention to your vessel.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_DISTRESS_TRAP";
  b.name = "Lanius fight distress";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius fight distress");
  assert.equal(g.event?.body, BODY);
}

describe("Lanius fight distress", () => {
  it("shows the printed intro, and the fight choice starts a Lanius combat", () => {
    // Wiki citations:
    // > "You are too late - whatever once was emitting the distress signal from this system drew a Lanius ship as well as your own. Having consumed the original target, the Lanius turn their attention to your vessel." — [[Lanius fight distress]]
    // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius fight distress]]
    const g = createGame(1);
    open(g);
    assert.equal(
      g.event?.choices.some((c) => c.id === "c:lanius-fight-distress:0"),
      true,
    );
    choose(g, "c:lanius-fight-distress:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-fight-distress");
    assert.equal(g.scrap, 10);
  });

  it("shows the intro card on arrival, then the fight button starts the Lanius ship", () => {
    // The printed sentence stays on the card. The fight button starts the Lanius ship. distress=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "LANIUS_DISTRESS_TRAP";
    dest.name = "Lanius fight distress";
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
    assert.equal(g.event?.choices[0]?.id, "c:lanius-fight-distress:0");
    choose(g, "c:lanius-fight-distress:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-fight-distress");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.equal(g.log.includes(BODY), false);
  });
});

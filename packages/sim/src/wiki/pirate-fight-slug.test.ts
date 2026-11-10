import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "There appears to be a pirate ship nearby. Be on your guard; anyone trying to hunt in Slug territory is either formidable or deeply stupid, and in space, either can be dangerous.",
  `"We knew anyone foolish enough to try and sneak through a Slug nebula would stick to open space. Yield your goods and we may let you live." You cut the transmission in lieu of a response.`,
  "Before you can take a moment's rest from the ever present nebulas in this sector, a pirate ship appears behind you and opens fire.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "SLUG_PIRATE";
  b.name = "Pirate fight (Slug)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight (Slug)");
}

describe("Pirate fight (Slug)", () => {
  it("shows one of the three intros, and the fight choice starts a pirate combat", () => {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Slug)]]
    // > "There appears to be a pirate ship nearby. Be on your guard; anyone trying to hunt in Slug territory is either formidable or deeply stupid, and in space, either can be dangerous." — [[Pirate fight (Slug)]]
    // > "\"We knew anyone foolish enough to try and sneak through a Slug nebula would stick to open space. Yield your goods and we may let you live.\" You cut the transmission in lieu of a response." — [[Pirate fight (Slug)]]
    // > "Before you can take a moment's rest from the ever present nebulas in this sector, a pirate ship appears behind you and opens fire." — [[Pirate fight (Slug)]]
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Slug)]]
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-slug:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-fight-slug:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-slug");
    assert.equal(g.scrap, 10);
  });

  it("starts the Pirate ship on arrival from the intro card", () => {
    // Wiki citations:
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Slug)]]
    // The page has no choice. One of the three printed intros, then "Fight a Pirate ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "SLUG_PIRATE";
    dest.name = "Pirate fight (Slug)";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    const intro = g.event?.body ?? "";
    assert.equal(g.phase, "event");
    assert.ok(INTROS.includes(intro), intro);
    assert.equal(g.log.includes(intro), false);
    assert.equal(g.event?.choices[0]?.id, "c:pirate-fight-slug:0");
    choose(g, "c:pirate-fight-slug:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.event, null);
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-slug");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.equal(g.log.includes(intro), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `You receive a message on a wide band frequency, originating from an approaching Lanius ship. It appears not to be directed at you, but your translator does its best all the same: "... metallic opportunity... acquisition... by force..." Looks like you're in for a fight.`,
  "Sensors indicate a small Lanius cruiser in the process of salvaging another small Lanius ship. Before you have a chance to wonder what caused them to turn on each other, the survivor notices you and moves in to attack.",
  "Shortly after your arrival, a Lanius ship jumps near the beacon. It begins to move slowly toward you. You open wide band communication channels, attempting to make contact. However, it either ignores you or is unable to receive the messages. As they get closer you issue the order to charge weapons and find they do the same.",
  "A military Lanius vessel stops repurposing an abandoned satellite as soon as you jump in. It blocks all hails and powers its weapons.",
  "The beacon is surrounded by many tiny Lanius crafts, surely only capable of holding one occupant. Perhaps they are some kind of forward scout searching for 'metallic opportunities'? As you consider this, a much larger Lanius vessel moves in to engage you, and the scout ships scatter in all directions.",
  "You arrive to see a well-armed Lanius craft preparing to salvage a badly damaged Rebel patrol ship. Noticing your arrival, the Lanius greedily moves in to intercept its second target of the day.",
  "As you arrive in the system, your proximity alarm begins screaming: there is a Lanius ship right on top of you! Before you have a chance to hail, they open fire!",
  "As you are getting your bearings, another ship suddenly arrives at the beacon - it's the Lanius, and they've marked your ship for salvage!",
  "At first everything seems quiet, then your scanners pick up a ship approaching at high speed - the Lanius have detected your arrival and are powering up their weapons!",
  "You have stumbled across a mining expedition - unfortunately, the miners are the Lanius, and they've chosen your ship as their target!",
  "As you are getting your bearings, another ship suddenly arrives at the beacon - it's the Lanius, and they've marked your ship for salvage!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-fight";
  b.name = "Lanius fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius fight");
}

describe("Lanius fight", () => {
  it("shows one of the eleven printed intros, including the repeated line, then fights a Lanius ship", () => {
    const unique = [...new Set(INTROS)];
    assert.equal(INTROS.length, 11);
    assert.equal(unique.length, 10);
    assert.equal(INTROS.filter((line) => line === INTROS[7]).length, 2);

    const seen = new Set<string>();
    for (let seed = 1; seed <= 400 && seen.size < unique.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:lanius-fight:0"));
      seen.add(body);
    }
    assert.equal(seen.size, unique.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:lanius-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "lanius-fight");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });

  it("starts the Lanius ship on arrival and leaves no button", () => {
    // The page has no choice. One of the eleven printed intros, including the repeated line, then "Fight a Lanius ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:lanius-fight";
    dest.name = "Lanius fight";
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
    assert.equal(g.fightEvent, "lanius-fight");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

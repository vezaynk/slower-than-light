import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `Your ship is hailed. "We've found you at last. Prepare to die!"`,
  "A small Rebel ship is docked at a small station. You try to lay low but it spots you. Power up the weapons!",
  "A Rebel ship has been patrolling this region. As soon as you arrive it begins its assault.",
  `A Rebel ship hails you: "Federation scum! We've waited a long time for this!"`,
  `You receive a transmission: "Sorry sir, this is nothing personal but we're under orders." The Rebel ship's weapons go hot.`,
  "By the time you notice the Rebel ship behind the beacon, it's too late to avoid a fight.",
  `A Rebel ship hails. "We did not fight a war to let a single Federation ship shatter our dreams of a better galaxy!" He locks weapons.`,
  `A Rebel ship approaches cautiously. "Personally," says the captain, "I'd have stuck with the Federation. But I'm a soldier, sir, and I'm no use without a war to fight. Raise your shields!"`,
  `You're hailed by a Rebel ship: "When the rebellion is complete you'll see the safer world we provide. Well, you won't, but you get the point." They arm weapons.`,
  "A Rebel ship is guarding this beacon. You order a pursuit course and prepare to scratch up one more.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight";
  b.name = "Rebel fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight");
}

describe("Rebel fight", () => {
  it("shows one of the ten intros, and the fight choice starts a Rebel combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight");
    assert.equal(g.scrap, 10);
  });

  it("starts the Rebel ship on arrival and leaves no button", () => {
    // The page has no choice. One of the ten printed intros, then "Fight a Rebel ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rebel-fight";
    dest.name = "Rebel fight";
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
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

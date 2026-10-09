import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You encounter a Rock vessel and attempt to open trading frequencies, but they take it as an act of cultural transgression and open fire.",
  "You jump into the middle of a Rock excavation project on a nearby moon. Unimpressed with your intrusion they move to defend themselves!",
  `You intercept chatter from an approaching Rock ship: "Weapons, moving in to engage, arm the tubes." There is no talking to these guys.`,
  "As you jump in, a vast figure appears on the view-screen. The Rock captain rubs the green, moss-like appendage on his chin and then orders his crew to open fire.",
  `It looks quiet, but you realize your computer is being scanned. A hidden Rock vessel hails you: "Why do you fill your computer with lies?! These are not the holy words!" Before you can interject they open fire.`,
  "You notice a Rock ship performing combat exercises. However, they quickly change their course to engage your ship. They apparently treat unregistered alien ships as handy target practice.",
  "A loud 'thud' resounds through the ship after jump completion - you've just shunted a Rock fighter and he's already preparing to fire!",
  "You're intercepted by a Rock salvage operation. They don't seem to mind that you're still on board while they junk your ship.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-fight";
  b.name = "Rock fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock fight");
}

describe("Rock fight", () => {
  it("shows one of the eight intros, and the fight choice starts a Rock ship combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rock-fight:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rock-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rock-fight");
    assert.equal(g.scrap, 10);
  });

  it("starts the Rock ship on arrival and leaves no button", () => {
    // The page has no choice. One of the eight printed intros, then "Fight a Rock ship." unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rock-fight";
    dest.name = "Rock fight";
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
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rock-fight");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});

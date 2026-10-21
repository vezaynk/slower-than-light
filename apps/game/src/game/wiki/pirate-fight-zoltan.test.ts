import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `"Emergency, all ships in range, we are under attack!" The frequency matches a nearby Zoltan ship; you move in on their pursuer. They take your intervention as a cue to jump away. Cowards.`,
  "You jump just in time to witness a Zoltan ship's FTL drive overload. In their final moments they implore you not to get involved, but it's too late - their attacker is already upon you!",
  "Despite their precautions, pirates have begun to harass the local Zoltan settlements across this sector. One such pirate spots your ship and moves in to attack.",
  "A ship with pirate markings demand that you surrender. These are sad times when even Zoltan space is beset by pirates. You doubt these fools will be missed.",
  "You spot a pirate ship looting a small Zoltan cruiser. They spot you and move in to attack before your FTL drive has a chance to recharge.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ZOLTAN_PIRATE";
  b.name = "Pirate fight (Zoltan)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight (Zoltan)");
}

describe("Pirate fight (Zoltan)", () => {
  it("shows one of the five intros, and the fight choice starts a pirate combat", () => {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Zoltan)]]
    // > "\"Emergency, all ships in range, we are under attack!\" The frequency matches a nearby Zoltan ship; you move in on their pursuer. They take your intervention as a cue to jump away. Cowards." — [[Pirate fight (Zoltan)]]
    // > "You jump just in time to witness a Zoltan ship's FTL drive overload. In their final moments they implore you not to get involved, but it's too late - their attacker is already upon you!" — [[Pirate fight (Zoltan)]]
    // > "Despite their precautions, pirates have begun to harass the local Zoltan settlements across this sector. One such pirate spots your ship and moves in to attack." — [[Pirate fight (Zoltan)]]
    // > "A ship with pirate markings demand that you surrender. These are sad times when even Zoltan space is beset by pirates. You doubt these fools will be missed." — [[Pirate fight (Zoltan)]]
    // > "You spot a pirate ship looting a small Zoltan cruiser. They spot you and move in to attack before your FTL drive has a chance to recharge." — [[Pirate fight (Zoltan)]]
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Zoltan)]]
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-zoltan:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-fight-zoltan:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-zoltan");
    assert.equal(g.scrap, 10);
  });

  it("starts the Pirate ship from the arrival card", () => {
    // Wiki citations:
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Zoltan)]]
    // The arrival card stays up. One of the five printed intros, then "Fight a Pirate ship."
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "ZOLTAN_PIRATE";
    dest.name = "Pirate fight (Zoltan)";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    const body = g.event?.body ?? "";
    assert.equal(g.phase, "event");
    assert.ok(INTROS.includes(body), body);
    assert.equal(g.log.includes(body), false);
    assert.equal(g.event?.choices[0]?.id, "c:pirate-fight-zoltan:0");
    choose(g, "c:pirate-fight-zoltan:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-zoltan");
    assert.equal(g.fleet, 1);
  });
});

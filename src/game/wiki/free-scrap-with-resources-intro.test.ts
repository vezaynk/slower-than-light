import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You arrive in a system and immediately discover a pirate ship nearby. Strangely, scans indicate there are no lifeforms aboard. You salvage anything useful, but find no clue as to the whereabouts of the former crew.",
  "Not much remains in this abandoned system; however, scans reveal a nearby mining platform with some salvageable materials.",
  "As you arrive in the system you are hailed by a loyalist settlement. Upon learning of your quest, they offer you supplies.",
  "Debris from a forgotten battle still orbits the gas giant in this system. Some of it still might be usable.",
  `You receive a message from a nearby station, "A Federation cruiser jumping into Rebel territory? Quite the bold move." You quickly move to arm the weapons but he continues, "Lucky for you we're not all in support of the Rebellion. Perhaps these supplies will help you get to friendlier space alive."`,
  "You happen upon the remains of a space station. It has been mostly picked clean but there appears to be a few materials that will aid you in your mission.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:free-scrap-with-resources";
  b.name = "Free scrap with resources";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Free scrap with resources");
}

describe("Free scrap with resources intro", () => {
  it("shows one of the six printed intros and keeps the medium-scrap choice", () => {
    assert.equal(INTROS.length, 6);
    assert.equal(new Set(INTROS).size, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:free-scrap-with-resources:0"));
      assert.equal(g.phase, "event");
      assert.equal(g.scrap, 10);
      assert.equal(g.enemy, null);
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);
  });
});

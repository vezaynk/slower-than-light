import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You arrive in an asteroid field and immediately begin evasive maneuvers when a loud clunk reverberates through the ship. At first you think the hull has been hit, but the noise came from some Rock intruders teleporting aboard the ship!",
  "Your shields are being taxed as they deflect the debris from an asteroid field. As you weave your way between the rocks, you happen upon a Rock pirate stronghold. You register teleport signatures and hear shouts aboard the ship.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-fight-with-boarders-in-asteroid-field";
  b.name = "Rock fight with boarders in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock fight with boarders in asteroid field");
}

describe("Rock fight with boarders in asteroid field", () => {
  it("shows one of the two intros, and the fight still beams Rock boarders in an asteroid field", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rock-fight-with-boarders-in-asteroid-field:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:rock-fight-with-boarders-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.asteroid, true);
    assert.equal(g.fightEvent, "rock-fight-with-boarders-in-asteroid-field");
    const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.ok(boarders.length >= 1 && boarders.length <= 2);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

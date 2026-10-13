import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

// Three printed intros, no odds. INFERRED: equal.
const INTROS = [
  `You come across a pirate in hot pursuit of an unidentified ship. You quickly receive a transmission from the pirate: "Stay out of this fight and we'll make it worth your while."`,
  "An unidentified ship is badly damaged and still being assaulted by a space pirate. The victim begins a distress message until the pirate cuts in and offers to split the bounty if you sit tight.",
  `A missile shoots across your bow when the jump completes. Your scans quickly reveal a ship with pirate markings pursuing an unknown vessel. The pirate hails you: "Damn it, we weren't expecting company. Stay out of this and you could profit."`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-briber";
  b.name = "Pirate briber";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate briber");
}

describe("Pirate briber intro", () => {
  it("shows one of the three printed intros, then attacks a pirate ship", () => {
    assert.equal(INTROS.length, 3);
    assert.equal(new Set(INTROS).size, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-briber:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-briber:1"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-briber:1");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-briber");
    assert.equal(g.scrap, 10);
  });
});

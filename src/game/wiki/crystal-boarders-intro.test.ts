import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You detect a heavily armed Crystalline ship escorting some sort of prison vessel. Scans indicate there are a number of non-Crystal based life forms aboard; they must be rounding up all of the intruders in their space! Before you can react, you hear the telltale sounds of a teleporter going off.",
  "You arrive near a small settlement and a lone guard ship moves to intercept you. You try to contact them but they are refusing all hails. Suddenly you hear lasers ricocheting from within the ship. You've been boarded!",
  `You pick up chatter from a nearby ship, "Yes... Here are some interesting specimens. Try to take them alive this time, there's a lot of money to be had on aliens." Scanners indicate a remote teleporter was just used.`,
];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Boarders: Crystal",
    tier: "",
    flag: "cited:boarders-crystal",
    asteroid: false,
  };
}

function open(g: Game) {
  g.event = citedEvent(g, beacon());
  g.phase = "event";
}

describe("Boarders: Crystal intros", () => {
  it("shows one of the three printed intros, then beams crystals with no ship", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.equal(g.event?.choices[0]?.id, "c:boarders-crystal:0");
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(2);
    open(g);
    choose(g, "c:boarders-crystal:0");
    const crystals = g.crew.filter((c) => c.side === "enemy" && c.kin === "shard" && c.aboard === "player");
    assert.ok(crystals.length >= 2 && crystals.length <= 3, String(crystals.length));
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "combat");
  });
});

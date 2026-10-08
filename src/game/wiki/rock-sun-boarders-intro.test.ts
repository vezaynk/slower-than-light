import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `As soon as you arrive you hear the telltale sounds of a teleporter and shouts reverberating through the ship, "Prepare to burn, fleshy meat-sack aliens!"`,
  "With their high resistance to heat, outlaw Rocks often settle very close to stars. That is why it is hardly surprising when your ship gets boarded as you stumble past a hidden settlement.",
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
    name: "Boarders: Rockmen near sun",
    tier: "",
    flag: "cited:boarders-rockmen-near-sun",
    asteroid: false,
  };
}

function open(g: Game) {
  g.event = citedEvent(g, beacon());
  g.phase = "event";
}

describe("Boarders: Rockmen near sun intros", () => {
  it("shows one of the two printed intros, then beams rocks with no ship", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.equal(g.event?.choices[0]?.id, "c:boarders-rockmen-near-sun:0");
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(2);
    open(g);
    choose(g, "c:boarders-rockmen-near-sun:0");
    const rocks = g.crew.filter((c) => c.side === "enemy" && c.kin === "stone" && c.aboard === "player");
    assert.ok(rocks.length >= 2 && rocks.length <= 3, String(rocks.length));
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "combat");
  });
});

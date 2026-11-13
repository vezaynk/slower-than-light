import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Mantis ship. It has not attacked yet.",
  "Mantis ship. It has not attacked yet.",
  "Mantis ship. It has not attacked yet.",
  "Mantis ship. It has not attacked yet.",
  "Mantis ship. It has not attacked yet.",
  "Mantis ship. It has not attacked yet.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "MANTIS_FIGHT_CHOICE";
  b.name = "Optional fight: Mantis ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Mantis ship");
}

describe("Optional fight: Mantis ship", () => {
  it("shows one of the six printed intros, then attacks a Mantis ship", () => {
    assert.equal(INTROS.length, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-fight-choice:0"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:mantis-fight-choice:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight-choice");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

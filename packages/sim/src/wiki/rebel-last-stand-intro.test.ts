import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Rebel ship attacking civilian ships.",
  "Rebel ship attacking civilian ships.",
  "Rebel ship attacking civilian ships.",
  "Rebel ship attacking civilian ships.",
  "Rebel ship attacking civilian ships.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "BOSS_SCOUT_RESCUE";
  b.name = "Rebel ship attacking civilians in Last Stand";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship attacking civilians in Last Stand");
}

describe("Rebel ship attacking civilians in Last Stand", () => {
  it("shows one of the five intros, and the fight choice starts a Rebel combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(
        g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-civilians-in-last-stand:0"),
      );
      assert.ok(
        g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-civilians-in-last-stand:1"),
      );
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-civilians-in-last-stand:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    const told = g.event?.body ?? "";
    assert.equal(told.length > 0, true);
    assert.equal(g.log.includes(told), false);
    assert.equal(g.enemy?.faction, "rebel");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.fightEvent, "rebel-ship-attacking-civilians-in-last-stand");
    assert.equal(g.scrap, 10);
    assert.equal(g.log.includes(told), false);
  });
});

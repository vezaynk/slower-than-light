import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `After a short time you receive a message, "Hello. I hope it's not a bother, but I'm looking for an escort to a nearby system. This region is quite dangerous and our ship is not well-armed."`,
  `There is a single ship at this beacon. They hail you, "We could really use some help. Our FTL navigation system is shot. Can you help us get to a nearby station where they can patch us up?"`,
  `"Hello," your communicator opens a hail from a nearby ship. "Our weapon systems are malfunctioning and we're too afraid of pirates to travel home unassisted. Can you escort us?"`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:escort-civilians";
  b.name = "Escort civilians";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Escort civilians");
}

describe("Escort civilians intro", () => {
  it("shows one of the three printed intros before Accept and Decline", () => {
    assert.equal(INTROS.length, 3);
    assert.equal(new Set(INTROS).size, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.deepEqual(
        g.event?.choices.map((c) => c.id),
        ["c:escort-civilians:0", "c:escort-civilians:1"],
      );
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    g.fleet = 5;
    choose(g, "c:escort-civilians:1");
    assert.equal(
      g.event?.body,
      "\"We understand. Not everyone is confident they can survive in these hostile times, let alone take the responsibility of protecting others.\"\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "A number of large transports are being pursued by a Rebel bombing squadron. One bomber has managed to slip through the defensive fire, and is poised to wreak among the enormous yet vulnerable transports. There's time for you to advance and take it out!",
  "Shots fly by your port windows followed by a Rebel scout in pursuit of a damaged cruiser. Should we move in to engage?",
  "There seems to be a small Federation colony under attack by a Rebel forward scout. Will you protect them?",
  "A battle rages nearby between small fighters; apparently fighting over a space station. The Federation appears to be losing ships fast. Shall we assist them?",
  "A civilian ship is broadcasting a request for assistance on a secure Federation channel. They are being harassed by Rebel scouts. Will you respond?",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-civilians-in-last-stand";
  b.name = "Rebel ship attacking civilians in Last Stand";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship attacking civilians in Last Stand");
}

describe("Rebel ship attacking civilians in Last Stand", () => {
  it("shows one of the five intros, and the fight choice starts a Rebel combat", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-civilians-in-last-stand:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-attacking-civilians-in-last-stand:1"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-ship-attacking-civilians-in-last-stand:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.fightEvent, "rebel-ship-attacking-civilians-in-last-stand");
    assert.equal(g.scrap, 10);
  });
});

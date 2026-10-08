import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `You receive a message from a nearby Rebel station, "You have a lot of guts passing through our space, I'll give you that." He turns giving an order, "Kill their crew, I want that ship intact."`,
  `Your sensors warn of an incoming Rebel ship at the same time as you hear the telltale signs of a teleporter. You hear someone taunt from within the ship, "Ready to die? I sure am ready to get a promotion!"`,
  `Incoming message, "Hello Captain," says a Rebel in an officer's garb. "How very generous of you to turn yourself in. Prepare to be boarded. Come quietly and we may be lenient."`,
  `You receive a message on a low-band channel. "You're surrounded, just like the last of your Federation friends. Just die already." The enemy has teleported onto your ship!`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-with-boarders";
  b.name = "Rebel fight with boarders";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight with boarders");
}

describe("Rebel fight with boarders intros", () => {
  it("shows one of the four intros, and the fight still beams human boarders", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-with-boarders:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:rebel-fight-with-boarders:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-with-boarders");
    const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.ok(boarders.length >= 2 && boarders.length <= 3);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});

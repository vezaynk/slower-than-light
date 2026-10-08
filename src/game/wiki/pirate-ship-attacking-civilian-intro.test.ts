import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You arrive in the system to see a pirate ship pursuing a civilian ship. You detect messages from the civilian ship on a distress frequency.",
  "Scanners indicate that a battle is taking place nearby. It seems that someone is under attack by space pirates.",
  "You detect two ships, one chasing the other... Scanners show the pursuer is a pirate!",
  "There are only two ships within range and they seem to be engaged in battle. One of them has the markings of a space pirate.",
  `You arrive at the next beacon only to immediately be hailed by a small shuttle. "Help us! We are being attacked by pirates!"`,
  "You come out of the jump to see laser blasts coming from the other side of the beacon. It looks like someone is under attack from pirates.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-civilian";
  b.name = "Pirate ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship attacking civilian");
}

describe("Pirate ship attacking civilian intro", () => {
  it("shows one of the six printed intros, then aids or stays out", () => {
    assert.equal(INTROS.length, 6);
    assert.equal(new Set(INTROS).size, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian:1"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);

    const stay = createGame(1);
    open(stay);
    choose(stay, "c:pirate-ship-attacking-civilian:1");
    assert.equal(stay.phase, "event");
    assert.match(stay.event?.body ?? "", /distress calls stop/);
    assert.equal(stay.scrap, 10);
  });
});

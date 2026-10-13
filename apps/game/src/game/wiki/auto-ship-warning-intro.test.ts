import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You discover one of the Rebel's autonomous scouts. The ship's AI wastes no time in engaging your ship.",
  `Your ship is hailed: "This is an automated message. Resisting our takeover is pointless. Prepare to die." It appears this Rebel ship is run by an AI.`,
  "A Rebel autonomous scout is exploring this beacon. You attempt to hide behind a nearby moon, but the ship finds you and begins its assault.",
  "The AI of a nearby small Rebel scout immediately identifies you as a threat and engages.",
  "A Rebel ship moves in to engage. You attempt to open communications, but realize the futility of that action when you see the ship is run by an AI.",
  "This must be one of the Rebels' unmanned scout ships. Looks like there's no way around a fight.",
  "Another unmanned ship patrols this area. You prepare the ship for combat.",
  "This beacon is being patrolled by a unmanned scout. A fight is unavoidable.",
  "A small shuttle appears on the local radar. Turns out it is a Rebel automated scout!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-warning";
  b.name = "Auto-ship warning";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship warning");
}

describe("Auto-ship warning intro", () => {
  it("shows one of the nine shared intros, then fights a running Auto-ship", () => {
    assert.equal(INTROS.length, 9);
    assert.equal(new Set(INTROS).size, 9);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:auto-ship-warning:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-warning:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "auto-ship-warning");
    assert.equal(g.scrap, 10);
  });
});

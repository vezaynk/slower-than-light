import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const INTROS = [
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
  "Hostile Auto-ship.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "AUTO_WARNING";
  b.name = "Auto-ship warning";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship warning");
}

describe("Auto-ship warning intro", () => {
  it("shows one of the nine shared intros, then fights a running Auto-ship", () => {
    assert.equal(INTROS.length, 9);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:auto-ship-warning:0"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-warning:0");
    const lead = eventText("ship_REBEL_AUTO_WARNING_escape_text");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "auto-ship-warning");
    assert.equal(g.scrap, 10);
  });
});

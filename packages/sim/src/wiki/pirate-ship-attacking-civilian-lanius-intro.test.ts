import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const INTROS = [
  "Pirate ship attacking a civilian ship.",
  "Pirate ship attacking a civilian ship.",
  "Pirate ship attacking a civilian ship.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_PIRATE_CIVILIAN";
  b.name = "Optional fight: pirate ship and civilian (Lanius)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: pirate ship and civilian (Lanius)");
}

describe("Pirate ship attacking civilian (Lanius) intro", () => {
  it("shows one of the three printed intros, then attacks or avoids", () => {
    assert.equal(INTROS.length, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian-lanius:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian-lanius:1"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    const lead = eventText("event_LANIUS_PIRATE_CIVILIAN_c1_text");
    choose(g, "c:pirate-ship-attacking-civilian-lanius:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian-lanius");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);

    const stay = createGame(1);
    open(stay);
    choose(stay, "c:pirate-ship-attacking-civilian-lanius:1");
    assert.equal(
      stay.event?.body,
      [eventText("event_LANIUS_CIVILIAN_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(stay.phase, "event");
    assert.equal(stay.scrap, 10);
  });
});

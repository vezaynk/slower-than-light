import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";
import { textRe } from "./quest-text-re.ts";

const INTROS = [
  "Pirate ship attacking a civilian ship.",
  "Pirate ship attacking a civilian ship.",
  "Pirate ship attacking a civilian ship.",
  "Pirate ship attacking a civilian ship.",
  "Pirate ship attacking a civilian ship.",
  "Pirate ship attacking a civilian ship.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_CIVILIAN";
  b.name = "Optional fight: pirate ship and civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: pirate ship and civilian");
}

describe("Pirate ship attacking civilian intro", () => {
  it("shows one of the six printed intros, then aids or stays out", () => {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate ship attacking civilian]]
    // > "You arrive in the system to see a pirate ship pursuing a civilian ship. You detect messages from the civilian ship on a distress frequency." — [[Pirate ship attacking civilian]]
    // > "Scanners indicate that a battle is taking place nearby. It seems that someone is under attack by space pirates." — [[Pirate ship attacking civilian]]
    // > "You detect two ships, one chasing the other... Scanners show the pursuer is a pirate!" — [[Pirate ship attacking civilian]]
    // > "There are only two ships within range and they seem to be engaged in battle. One of them has the markings of a space pirate." — [[Pirate ship attacking civilian]]
    // > "You arrive at the next beacon only to immediately be hailed by a small shuttle. \"Help us! We are being attacked by pirates!\"" — [[Pirate ship attacking civilian]]
    // > "You come out of the jump to see laser blasts coming from the other side of the beacon. It looks like someone is under attack from pirates." — [[Pirate ship attacking civilian]]
    assert.equal(INTROS.length, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian:1"));
      seen.add(body);
    }
    assert.equal(seen.size, new Set(INTROS).size);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian:0");
    const lead = eventText("event_PIRATE_CIVILIAN_c1_text");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);

    const stay = createGame(1);
    open(stay);
    choose(stay, "c:pirate-ship-attacking-civilian:1");
    assert.equal(stay.phase, "event");
    assert.match(
      stay.event?.body ?? "",
      textRe("event_PIRATE_CIVILIAN_BEACON_c2_text", "event_PIRATE_CIVILIAN_c2_text"),
    );
    assert.equal(stay.scrap, 10);
  });
});

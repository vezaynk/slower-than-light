import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY = `You see a small station fitted with hundreds of Repair drones. You receive an automated message, "We don't know who you are and we don't care, but this is the right place for some ship repair!"`;

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "REPAIR_STATION";
  b.name = "Repair station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Repair station");
}

describe("Repair station", () => {
  it("shows the printed station sentence before the repair choices", () => {
    // Wiki citations:
    // > "You see a small station fitted with hundreds of Repair drones. You receive an automated message, \"We don't know who you are and we don't care, but this is the right place for some ship repair!\"" — [[Repair station]]
    // > "Repair 20 damage. [ Scrap lost: 40 ]" — [[Repair station]]
    // > "Repair 10 damage. [ Scrap lost: 20 ]" — [[Repair station]]
    // > "Repair 5 damage. [ Scrap lost: 10 ]" — [[Repair station]]
    // > "\"Thank you for your business, no refunds!\"" — [[Repair station]]
    // > "Your ship receives 20 repairs." — [[Repair station]]
    // > "Your ship receives 10 repairs." — [[Repair station]]
    // > "Your ship receives 5 repairs." — [[Repair station]]
    // > "Ignore the station." — [[Repair station]]
    // > "Nothing happens." — [[Repair station]]
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.equal(
      g.event?.choices.some((c) => c.id === "c:repair-station:0"),
      true,
    );
    assert.equal(
      g.event?.choices.some((c) => c.id === "c:repair-station:3"),
      true,
    );
  });
});

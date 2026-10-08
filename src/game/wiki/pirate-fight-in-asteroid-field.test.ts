import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY = "A pirate ship was lying in wait inside this asteroid field. It immediately moves in to attack.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight-in-asteroid-field";
  b.name = "Pirate fight in asteroid field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight in asteroid field");
}

describe("Pirate fight in asteroid field", () => {
  it("shows the printed wait, and the fight starts inside an asteroid field", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, BODY);
    assert.ok(g.event?.choices.some((c) => c.id === "c:pirate-fight-in-asteroid-field:0"));
    choose(g, "c:pirate-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-fight-in-asteroid-field");
    assert.equal(g.asteroid, true);
    assert.equal(g.scrap, 10);
  });
});

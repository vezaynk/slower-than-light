import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You're surprised to find a ship without Slug markings stranded all the way out here, and move in to provide assistance. When you see the pirate insignia on the hull you quickly reconsider.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-fight-choice-in-nebula";
  b.name = "Pirate fight choice in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate fight choice in nebula");
}

describe("Pirate fight choice in nebula", () => {
  it("shows both sentences, attacking starts a pirate fight, and keeping distance does nothing", () => {
    const attack = createGame(1);
    open(attack);
    assert.equal(attack.event?.body, BODY);
    assert.ok(attack.event?.choices.some((c) => c.id === "c:pirate-fight-choice-in-nebula:0"));
    assert.ok(attack.event?.choices.some((c) => c.id === "c:pirate-fight-choice-in-nebula:1"));
    choose(attack, "c:pirate-fight-choice-in-nebula:0");
    assert.equal(attack.phase, "combat");
    assert.equal(attack.enemy?.pirate, true);
    assert.equal(attack.fightEvent, "pirate-fight-choice-in-nebula");
    assert.equal(attack.scrap, 10);

    const away = createGame(2);
    open(away);
    choose(away, "c:pirate-fight-choice-in-nebula:1");
    assert.equal(away.phase, "map");
    assert.equal(away.scrap, 10);
    assert.equal(away.enemy, null);
  });
});

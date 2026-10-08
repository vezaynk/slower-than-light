import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const ID = "c:slaver-hostile:2";
const LABEL = "Draw straws and send a crew-member over to the slavers.";
const CLONE = "You briefly consider cloning a replacement, but decide to respect the Federation laws regarding simultaneous duplicates.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slaver-hostile";
  b.name = "Slaver (hostile)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slaver (hostile)");
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player" && c.hp > 0);
}

describe("Slaver (hostile) draw straws", () => {
  it("loses one crewmember and a Clone Bay still does not revive them", () => {
    const plain = createGame(3);
    open(plain);
    assert.ok(plain.event?.choices.some((c) => c.id === ID && c.label === LABEL));
    const before = players(plain).length;
    const scrap = plain.scrap;
    const weapons = plain.player.weapons.length;
    choose(plain, ID);
    assert.equal(players(plain).length, before - 1);
    assert.equal(plain.event?.body?.includes("You lose a crewmember."), true);
    assert.equal(plain.event?.body?.includes(CLONE), false);
    assert.equal(plain.event?.body?.includes("revived"), false);
    assert.equal(plain.phase, "event");
    assert.equal(plain.enemy, null);
    assert.equal(plain.scrap, scrap);
    assert.equal(plain.player.weapons.length, weapons);

    const cloned = createGame(4);
    cloned.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    open(cloned);
    const clonedBefore = players(cloned).length;
    choose(cloned, ID);
    assert.equal(players(cloned).length, clonedBefore - 1);
    assert.equal(cloned.event?.body?.includes("You lose a crewmember."), true);
    assert.equal(cloned.event?.body?.includes(CLONE), true);
    assert.equal(cloned.event?.body?.includes("revived"), false);
    assert.equal(cloned.enemy, null);
  });
});

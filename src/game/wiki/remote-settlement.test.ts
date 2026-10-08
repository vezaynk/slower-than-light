import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  `Scans show a remote settlement being blockaded by a pirate ship. The ship hastily messages you, "Stay out of this, or you'll be next!...Concentrate fire on..."`;

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:remote-settlement";
  b.name = "Remote settlement";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Remote settlement", () => {
  it("prints the blockade sentence and both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Remote settlement");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.event?.choices.some((c) => c.id === "c:remote-settlement:0"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:remote-settlement:1"), true);
  });

  it("attacking the pirate starts a pirate fight and changes nothing else", () => {
    const g = createGame(1);
    open(g);
    const crew = g.crew.filter((c) => c.side === "player").length;
    choose(g, "c:remote-settlement:0");
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy);
    assert.equal(g.enemy.faction === "pirate" || g.enemy.pirate === true, true);
    assert.equal(g.fightEvent, "remote-settlement");
    assert.equal(g.scrap, 10);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });

  it("ignoring them shows the printed jump sentence and nothing happens", () => {
    const g = createGame(1);
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    g.fleet = 5;
    choose(g, "c:remote-settlement:1");
    assert.equal(
      g.event?.body,
      "It's just not possible to save every civilian affected by this war. You prepare to jump.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });
});

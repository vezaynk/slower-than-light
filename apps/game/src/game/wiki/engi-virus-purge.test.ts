import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:the-engi-virus";
  b.name = "The Engi virus";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "The Engi virus");
}

describe("The Engi virus purge", () => {
  it("prints the wipe sentence, halves engines and shields, and fights an Engi ship", () => {
    const g = createGame(51);
    open(g);
    g.player.systems.shields.level = 4;
    g.player.systems.shields.power = 4;
    g.player.systems.shields.damage = 0;
    g.player.systems.shields.ion = [];
    g.player.shieldNow = 2;
    g.player.systems.engines.level = 6;
    g.player.systems.engines.power = 6;
    g.player.systems.engines.damage = 0;
    g.player.systems.engines.ion = [];
    choose(g, "c:the-engi-virus:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "engi");
    assert.equal(g.fightEvent, "the-engi-virus");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.shieldNow, 1);
    assert.ok(
      g.log.includes(
        "Wiping your engine core and shields proves useless... eventually you trap the virus in the weapons systems to purge it, but before you do, the Engi grow restless and attack!",
      ),
    );
  });
});

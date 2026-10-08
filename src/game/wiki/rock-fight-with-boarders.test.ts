import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You passively scan a small Rock station that is next to the beacon. However they must not have appreciated your curiosity. A Rock ship pulls away from the station and you register an incoming teleporter signal as well!",
  "You find a Rock ship docked with a damaged Mantis fighter. Before you have a chance to hail them, the ship moves in to attack you and you register teleporter symbols from the disabled ship. They're using Mantis tech to board you!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-fight-with-boarders";
  b.name = "Rock fight with boarders";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock fight with boarders");
}

describe("Rock fight with boarders", () => {
  it("shows one of the two intros, and the fight still beams Rock boarders", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rock-fight-with-boarders:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:rock-fight-with-boarders:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rock-fight-with-boarders");
    const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.ok(boarders.length >= 1 && boarders.length <= 3);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });

  it("applies the red line on arrival and leaves no button", () => {
    // The page has no choice. "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)."
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rock-fight-with-boarders";
    dest.name = "Rock fight with boarders";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.fightEvent, "rock-fight-with-boarders");
    const rocks = g.crew.filter((c) => c.side === "enemy" && c.kin === "stone" && c.aboard === "player");
    assert.ok(rocks.length >= 1 && rocks.length <= 3, String(rocks.length));
    assert.ok(g.log.some((line) => line.includes("rock boarders beam aboard your ship.")));
  });
});

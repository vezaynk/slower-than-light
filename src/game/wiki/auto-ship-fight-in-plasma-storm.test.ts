import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-fight-in-plasma-storm";
  b.name = "Auto-ship fight in plasma storm";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Auto-ship fight in plasma storm");
}

describe("Auto-ship fight in plasma storm", () => {
  it("preparing to fight starts an Auto-ship", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, "You jump into a sector of the nebula beset by a plasma storm. An automated Rebel scout stationed at the beacon moves in to attack.");
    for (const n of [1, 2, 3]) {
      assert.equal(g.event?.choices.some((c) => c.id === `c:auto-ship-fight-in-plasma-storm:${n}`), true);
    }
    choose(g, "c:auto-ship-fight-in-plasma-storm:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-fight-in-plasma-storm");
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(g.asteroid, false);
    assert.equal(g.scrap, 10);
  });

  it("engines 3 to 5 lose the ship or start the fight, and other levels stay shut", () => {
    const low = createGame(1);
    open(low);
    low.player.systems.engines.level = 2;
    assert.equal(choiceDisabled(low, "c:auto-ship-fight-in-plasma-storm:1"), "Needs Engines level 3-5");
    choose(low, "c:auto-ship-fight-in-plasma-storm:1");
    assert.equal(low.phase, "event");
    assert.equal(low.scrap, 10);

    const high = createGame(1);
    open(high);
    high.player.systems.engines.level = 6;
    assert.equal(choiceDisabled(high, "c:auto-ship-fight-in-plasma-storm:1"), "Needs Engines level 3-5");

    let fight = false;
    let lost = false;
    for (let seed = 1; seed <= 40 && (!fight || !lost); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.systems.engines.level = 4;
      assert.equal(choiceDisabled(g, "c:auto-ship-fight-in-plasma-storm:1"), null);
      choose(g, "c:auto-ship-fight-in-plasma-storm:1");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.fightEvent, "auto-ship-fight-in-plasma-storm");
        assert.equal(g.enemy?.faction, "auto");
        assert.equal(g.scrap, 10);
      } else {
        lost = true;
        assert.match(g.event?.body ?? "", /lose the ship in the storm/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, 10);
        assert.equal(g.fleet, 5);
      }
    }
    assert.equal(fight && lost, true);
  });

  it("engines level 6 or higher loses the ship, and cloaking does the same", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:auto-ship-fight-in-plasma-storm:2"), "Needs level 6 Engines");
    assert.equal(choiceDisabled(bare, "c:auto-ship-fight-in-plasma-storm:3"), "Needs Cloaking");
    choose(bare, "c:auto-ship-fight-in-plasma-storm:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    const fast = createGame(3);
    open(fast);
    fast.player.systems.engines.level = 6;
    assert.equal(choiceDisabled(fast, "c:auto-ship-fight-in-plasma-storm:2"), null);
    choose(fast, "c:auto-ship-fight-in-plasma-storm:2");
    assert.match(fast.event?.body ?? "", /lose the ship in the storm/);
    assert.match(fast.event?.body ?? "", /Nothing happens/);
    assert.equal(fast.phase, "event");
    assert.equal(fast.scrap, 10);
    assert.equal(fast.fleet, 5);

    const cloaked = createGame(4);
    open(cloaked);
    cloaked.player.kits.veil = { id: "veil", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    assert.equal(choiceDisabled(cloaked, "c:auto-ship-fight-in-plasma-storm:3"), null);
    choose(cloaked, "c:auto-ship-fight-in-plasma-storm:3");
    assert.match(cloaked.event?.body ?? "", /lose your pursuer in the storm/);
    assert.match(cloaked.event?.body ?? "", /Nothing happens/);
    assert.equal(cloaked.scrap, 10);
    assert.equal(cloaked.player.parts, bare.player.parts);
  });
});

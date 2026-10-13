import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-near-storage-station-in-nebula";
  b.name = "Auto-ship near storage station in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.player.parts = 3;
  assert.equal(g.event?.title, "Auto-ship near storage station in nebula");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

describe("Auto-ship near storage station in nebula", () => {
  it("attacking starts an Auto-ship fight", () => {
    const g = createGame(1);
    open(g);
    for (const n of [2, 3, 4, 5]) {
      assert.equal(g.event?.choices.some((c) => c.id === `c:auto-ship-near-storage-station-in-nebula:${n}`), true);
    }
    choose(g, "c:auto-ship-near-storage-station-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-near-storage-station-in-nebula");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.parts, 3);
  });

  it("a destroyed ship pays medium scrap only, then the station", () => {
    const g = createGame(1);
    open(g);
    const guns = g.player.weapons.length;
    assert.equal(pageWin(g, "auto-ship-near-storage-station-in-nebula", false), true);
    const body = g.event?.body ?? "";
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(g.scrap, 10 + paid[0]!);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.event?.choices.some((c) => c.id === "q:auto-storage:investigate"), true);
    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-near-storage-station-in-nebula", true), false);
  });

  it("cloaking starts the fight or opens the station, and level 2 always opens it", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-storage-station-in-nebula:2"), "Needs Cloaking");
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-storage-station-in-nebula:3"), "Needs level 2 Cloaking");
    choose(bare, "c:auto-ship-near-storage-station-in-nebula:2");
    assert.equal(bare.phase, "event");

    let fight = false;
    let station = false;
    for (let seed = 1; seed <= 40 && (!fight || !station); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.veil = { id: "veil", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      assert.equal(choiceDisabled(g, "c:auto-ship-near-storage-station-in-nebula:2"), null);
      assert.equal(choiceDisabled(g, "c:auto-ship-near-storage-station-in-nebula:3"), "Needs level 2 Cloaking");
      choose(g, "c:auto-ship-near-storage-station-in-nebula:2");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.fightEvent, "auto-ship-near-storage-station-in-nebula");
        assert.equal(g.player.parts, 3);
      } else {
        station = true;
        assert.match(g.event?.body ?? "", /undetected/);
        assert.equal(g.player.parts, 3);
      }
    }
    assert.equal(fight && station, true);

    const improved = createGame(3);
    open(improved);
    improved.player.kits.veil = { id: "veil", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
    assert.equal(choiceDisabled(improved, "c:auto-ship-near-storage-station-in-nebula:3"), null);
    choose(improved, "c:auto-ship-near-storage-station-in-nebula:3");
    assert.equal(improved.phase, "event");
    assert.match(improved.event?.body ?? "", /undetected/);
    assert.equal(improved.scrap, 10);
    assert.equal(improved.player.parts, 3);
  });

  it("hacking spends one drone part, and level 2 always opens the station", () => {
    const bare = createGame(1);
    open(bare);
    bare.player.parts = 0;
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-storage-station-in-nebula:4"), "Needs a Hacking system");
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-storage-station-in-nebula:5"), "Needs level 2 Hacking");

    const broke = createGame(2);
    open(broke);
    broke.player.parts = 0;
    broke.player.kits.spike = { id: "spike", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    assert.equal(choiceDisabled(broke, "c:auto-ship-near-storage-station-in-nebula:4"), "Need 1 drone part");
    choose(broke, "c:auto-ship-near-storage-station-in-nebula:4");
    assert.equal(broke.player.parts, 0);
    assert.equal(broke.phase, "event");

    let fight = false;
    let station = false;
    for (let seed = 1; seed <= 40 && (!fight || !station); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.spike = { id: "spike", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      choose(g, "c:auto-ship-near-storage-station-in-nebula:4");
      assert.equal(g.player.parts, 2);
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.fightEvent, "auto-ship-near-storage-station-in-nebula");
      } else {
        station = true;
        assert.match(g.event?.body ?? "", /sever the connection/);
      }
    }
    assert.equal(fight && station, true);

    const improved = createGame(4);
    open(improved);
    improved.player.kits.spike = { id: "spike", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
    assert.equal(choiceDisabled(improved, "c:auto-ship-near-storage-station-in-nebula:5"), null);
    const guns = improved.player.weapons.length;
    choose(improved, "c:auto-ship-near-storage-station-in-nebula:5");
    assert.equal(improved.player.parts, 2);
    assert.equal(improved.phase, "event");
    assert.match(improved.event?.body ?? "", /completely undetected/);
    assert.equal(improved.scrap, 10);
    assert.equal(improved.player.weapons.length, guns);
  });

  it("avoiding the ship spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-near-storage-station-in-nebula:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.parts, 3);
  });
});

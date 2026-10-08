import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-near-storage-station";
  b.name = "Auto-ship near storage station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Auto-ship near storage station");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Auto-ship near storage station", () => {
  it("attacking starts an Auto-ship fight", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, "An advanced Rebel automated ship remains stationed near a small Rebel space-station. Sensors indicate it's a storage vessel for military goods.");
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-near-storage-station:2"), true);
    choose(g, "c:auto-ship-near-storage-station:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-near-storage-station");
    assert.equal(g.scrap, 10);
  });

  it("a destroyed ship pays medium scrap only, then the station", () => {
    const g = createGame(1);
    open(g);
    const guns = g.player.weapons.length;
    assert.equal(pageWin(g, "auto-ship-near-storage-station", false), true);
    const body = g.event?.body ?? "";
    assert.match(body, /salvage what you can/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 0, body);
    assert.equal(g.scrap, 10 + paid[0]!);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.event?.choices.some((c) => c.id === "q:auto-storage:investigate"), true);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-near-storage-station", true), false);
    assert.equal(killed.scrap, 10);
  });

  it("cloaking starts the fight or opens the station, and stays shut without it", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-storage-station:2"), "Needs Cloaking");
    choose(bare, "c:auto-ship-near-storage-station:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    let fight = false;
    let station = false;
    for (let seed = 1; seed <= 40 && (!fight || !station); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.veil = { id: "veil", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      assert.equal(choiceDisabled(g, "c:auto-ship-near-storage-station:2"), null);
      choose(g, "c:auto-ship-near-storage-station:2");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.fightEvent, "auto-ship-near-storage-station");
        assert.equal(g.scrap, 10);
      } else {
        station = true;
        assert.match(g.event?.body ?? "", /avoiding detection/);
        assert.equal(g.scrap, 10);
        assert.equal(g.event?.choices.some((c) => c.id === "q:auto-storage:investigate"), true);
      }
    }
    assert.equal(fight && station, true);
  });

  it("the station pays low scrap, medium resources with some scrap, or nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 4; seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "auto-ship-near-storage-station", false);
      const before = g.scrap;
      const guns = g.player.weapons.length;
      const augs = g.augments.length;
      choose(g, "q:auto-storage:investigate");
      const body = g.event?.body ?? "";
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.augments.length, augs);
      if (/military grade weapons/.test(body) || /functioning Schematic/.test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 0, body);
        assert.equal(g.scrap, before + paid[0]!);
        seen.add(/Schematic/.test(body) ? "schematic" : "weapon");
      } else if (/various resources/.test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + paid[0]!);
        seen.add("resources");
      } else {
        assert.match(body, /Nothing happens/);
        assert.equal(body.includes("Scrap:"), false);
        assert.equal(g.scrap, before);
        seen.add("nothing");
      }
    }
    assert.deepEqual([...seen].sort(), ["nothing", "resources", "schematic", "weapon"]);
  });

  it("avoiding the ship spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:auto-ship-near-storage-station:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
  });
});

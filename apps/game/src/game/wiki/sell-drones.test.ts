import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Sell drone parts for scrap",
    tier: "",
    flag: "cited:sell-drone-parts-for-scrap",
    asteroid: false,
  };
}

describe("Sell drone parts for scrap", () => {
  it("opens on the printed damaged-station line", () => {
    const g = createGame(1);
    const ev = citedEvent(g, beacon());
    assert.equal(
      ev?.body,
      "You see a civilian space station with heavy damage. You receive a message, \"We've been hit hard by the war. We need more drone parts to speed up our repairs. We'll buy some from you if you have extra.\"",
    );
  });

  it("sells 3, 6, or 12 drone parts for 12, 24, or 48 scrap", () => {
    const rows: [string, number, number][] = [
      ["c:sell-drone-parts-for-scrap:0", 3, 12],
      ["c:sell-drone-parts-for-scrap:1", 6, 24],
      ["c:sell-drone-parts-for-scrap:2", 12, 48],
    ];
    for (const [id, parts, scrap] of rows) {
      const g = createGame(1);
      g.phase = "event";
      g.player.parts = parts - 1;
      g.scrap = 40;
      const collected = g.scrapCollected ?? 0;
      assert.equal(choiceDisabled(g, id), `Need ${parts} drone parts`);
      choose(g, id);
      assert.equal(g.player.parts, parts - 1);
      assert.equal(g.scrap, 40);
      assert.equal(g.scrapCollected ?? 0, collected);
      assert.equal(g.phase, "event");

      g.player.parts = parts;
      choose(g, id);
      assert.equal(g.player.parts, 0);
      assert.equal(g.scrap, 40 + scrap);
      assert.equal(g.scrapCollected ?? 0, collected + scrap);
      assert.equal(g.phase, "map");
      assert.ok(g.log.some((line) => line.includes("Thank you for your business.")));
      assert.ok(g.log.some((line) => line === `You receive ${scrap} scrap.`));
    }
  });

  it("lets Scrap Recovery Arm and Repair Arm change the scrap", () => {
    const hook = createGame(2);
    hook.player.parts = 3;
    hook.scrap = 0;
    hook.scrapCollected = 0;
    hook.augments = ["hook"];
    choose(hook, "c:sell-drone-parts-for-scrap:0");
    assert.equal(hook.player.parts, 0);
    assert.equal(hook.scrap, 13);
    assert.equal(hook.scrapCollected, 12);
    assert.ok(hook.log.some((line) => line === "You receive 13 scrap."));

    const weld = createGame(3);
    weld.player.parts = 3;
    weld.scrap = 0;
    weld.scrapCollected = 0;
    weld.player.hull = weld.player.hullMax - 5;
    weld.augments = ["weld"];
    choose(weld, "c:sell-drone-parts-for-scrap:0");
    assert.equal(weld.scrap, 10);
    assert.equal(weld.scrapCollected, 12);
    assert.equal(weld.player.hull, weld.player.hullMax - 3);

    const both = createGame(4);
    both.player.parts = 3;
    both.scrap = 0;
    both.player.hull = 10;
    both.augments = ["hook", "weld"];
    choose(both, "c:sell-drone-parts-for-scrap:0");
    assert.equal(both.scrap, 11);
    assert.equal(both.player.hull, 12);
  });

  it("ignoring the station spends nothing", () => {
    const g = createGame(5);
    g.phase = "event";
    g.player.parts = 8;
    g.scrap = 20;
    choose(g, "c:sell-drone-parts-for-scrap:3");
    assert.equal(g.player.parts, 8);
    assert.equal(g.scrap, 20);
    assert.equal(g.phase, "map");
  });
});

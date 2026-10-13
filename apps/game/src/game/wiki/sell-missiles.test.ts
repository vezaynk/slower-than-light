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
    name: "Sell missiles for scrap",
    tier: "",
    flag: "cited:sell-missiles-for-scrap",
    asteroid: false,
  };
}

describe("Sell missiles for scrap", () => {
  it("opens on the printed black-market line", () => {
    const g = createGame(1);
    const ev = citedEvent(g, beacon());
    assert.equal(
      ev?.body,
      "There is a black market hub here. You receive a message, \"These are dangerous times. If you have extra military-grade explosives, we'll gladly pay you for them.\"",
    );
  });

  it("sells 5, 10, or 15 missiles for 15, 30, or 45 scrap", () => {
    const rows: [string, number, number][] = [
      ["c:sell-missiles-for-scrap:0", 5, 15],
      ["c:sell-missiles-for-scrap:1", 10, 30],
      ["c:sell-missiles-for-scrap:2", 15, 45],
    ];
    for (const [id, missiles, scrap] of rows) {
      const g = createGame(1);
      g.phase = "event";
      g.missiles = missiles - 1;
      g.scrap = 40;
      const collected = g.scrapCollected ?? 0;
      assert.equal(choiceDisabled(g, id), `Need ${missiles} missiles`);
      choose(g, id);
      assert.equal(g.missiles, missiles - 1);
      assert.equal(g.scrap, 40);
      assert.equal(g.scrapCollected ?? 0, collected);
      assert.equal(g.phase, "event");

      g.missiles = missiles;
      choose(g, id);
      assert.equal(g.missiles, 0);
      assert.equal(g.scrap, 40 + scrap);
      assert.equal(g.scrapCollected ?? 0, collected + scrap);
      assert.equal(g.phase, "map");
      assert.ok(g.log.some((line) => line.includes("Thank you, this will help greatly.")));
      assert.ok(g.log.some((line) => line === `You receive ${scrap} scrap.`));
    }
  });

  it("lets Scrap Recovery Arm and Repair Arm change the scrap", () => {
    const hook = createGame(2);
    hook.missiles = 5;
    hook.scrap = 0;
    hook.scrapCollected = 0;
    hook.augments = ["hook"];
    choose(hook, "c:sell-missiles-for-scrap:0");
    assert.equal(hook.missiles, 0);
    assert.equal(hook.scrap, 16);
    assert.equal(hook.scrapCollected, 15);
    assert.ok(hook.log.some((line) => line === "You receive 16 scrap."));

    const weld = createGame(3);
    weld.missiles = 5;
    weld.scrap = 0;
    weld.scrapCollected = 0;
    weld.player.hull = weld.player.hullMax - 5;
    weld.augments = ["weld"];
    choose(weld, "c:sell-missiles-for-scrap:0");
    assert.equal(weld.scrap, 12);
    assert.equal(weld.scrapCollected, 15);
    assert.equal(weld.player.hull, weld.player.hullMax - 3);

    const both = createGame(4);
    both.missiles = 5;
    both.scrap = 0;
    both.player.hull = 10;
    both.augments = ["hook", "weld"];
    choose(both, "c:sell-missiles-for-scrap:0");
    assert.equal(both.scrap, 14);
    assert.equal(both.player.hull, 12);
  });

  it("ignoring the station spends nothing", () => {
    const g = createGame(5);
    g.phase = "event";
    g.missiles = 8;
    g.scrap = 20;
    choose(g, "c:sell-missiles-for-scrap:3");
    assert.equal(g.missiles, 8);
    assert.equal(g.scrap, 20);
    assert.equal(g.phase, "map");
  });
});

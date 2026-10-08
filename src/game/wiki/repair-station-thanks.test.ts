import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const THANKS = "\"Thank you for your business, no refunds!\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:repair-station";
  b.name = "Repair station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Repair station");
}

describe("Repair station thanks", () => {
  it("thanks the buyer on each paid repair and stays quiet on ignore", () => {
    const rows: [string, number, number][] = [
      ["c:repair-station:0", 40, 20],
      ["c:repair-station:1", 20, 10],
      ["c:repair-station:2", 10, 5],
    ];
    for (const [id, scrap, hull] of rows) {
      const g = createGame(1);
      open(g);
      assert.ok(g.player.hullMax > hull);
      g.player.hull = g.player.hullMax - hull;
      g.scrap = 40;
      const beforeHull = g.player.hull;
      choose(g, id);
      assert.ok(g.log.includes(THANKS));
      assert.equal(g.scrap, 40 - scrap);
      assert.equal(g.player.hull, beforeHull + hull);
      assert.ok(g.player.hull <= g.player.hullMax);
    }

    const ignored = createGame(1);
    open(ignored);
    ignored.player.hull = ignored.player.hullMax - 20;
    ignored.scrap = 40;
    choose(ignored, "c:repair-station:3");
    assert.equal(ignored.scrap, 40);
    assert.equal(ignored.player.hull, ignored.player.hullMax - 20);
    assert.equal(ignored.log.includes(THANKS), false);
  });
});

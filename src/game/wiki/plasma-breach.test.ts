import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { fillerChoose } from "./filler-events.ts";

const ID = "c:plasma-storm-incapacitated-ships:0";

function bars(g: Game): number {
  return Object.values(g.player.systems).reduce((n, s) => n + (s?.damage ?? 0), 0);
}

function breached(g: Game) {
  return g.player.rooms.filter((r) => r.breach > 0);
}

describe("Plasma storm incapacitated ships", () => {
  it("the debris result deals 4 hull and breaches one system room without damaging it", () => {
    const titles = new Set<string>();
    let hits = 0;
    for (let seed = 1; seed <= 400 && hits < 24; seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      const scrap = g.scrap;
      fillerChoose(g, ID);
      if (!g.event?.body.includes("damaging the hull")) {
        assert.ok(g.player.rooms.every((r) => r.breach === 0));
        assert.equal(bars(g), 0);
        continue;
      }
      hits++;
      const rooms = breached(g);
      assert.equal(rooms.length, 1);
      assert.equal(rooms[0].breach, 1);
      assert.ok(rooms[0].system);
      titles.add(rooms[0].system!);
      assert.equal(bars(g), 0);
      assert.equal(g.player.hull, hull - 4);
      assert.ok(g.scrap > scrap);
      assert.equal(g.phase, "event");
      assert.match(g.event.body, /A breach opens in /);
    }
    assert.ok(hits >= 12, String(hits));
    assert.ok(titles.size >= 2, [...titles].join(","));
  });

  it("skips the breach when that system has no room, and still does not damage it", () => {
    let hits = 0;
    for (let seed = 1; seed <= 250 && hits < 6; seed++) {
      const g = createGame(seed);
      for (const r of g.player.rooms) r.system = null;
      fillerChoose(g, ID);
      if (!g.event?.body.includes("damaging the hull")) continue;
      hits++;
      assert.ok(g.player.rooms.every((r) => r.breach === 0));
      assert.equal(bars(g), 0);
      assert.equal(g.player.hull, 26);
      assert.doesNotMatch(g.event.body, /A breach opens/);
    }
    assert.ok(hits >= 3, String(hits));
  });

  it("a killing hit does not open a breach", () => {
    let hits = 0;
    for (let seed = 1; seed <= 200 && hits < 4; seed++) {
      const g = createGame(seed);
      g.player.hull = 4;
      fillerChoose(g, ID);
      if (g.phase !== "defeat") continue;
      hits++;
      assert.ok(g.player.rooms.every((r) => r.breach === 0));
      assert.equal(bars(g), 0);
    }
    assert.ok(hits >= 2, String(hits));
  });

  it("waiting does not breach the hull", () => {
    const g = createGame(1);
    fillerChoose(g, "c:plasma-storm-incapacitated-ships:1");
    assert.ok(g.player.rooms.every((r) => r.breach === 0));
    assert.equal(g.player.hull, 30);
    assert.equal(bars(g), 0);
  });
});

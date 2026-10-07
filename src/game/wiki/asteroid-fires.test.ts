import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { fillerChoose } from "./filler-events.ts";

const ID = "c:large-asteroid-field:0";

function bars(g: Game): number {
  return Object.values(g.player.systems).reduce((n, s) => n + (s?.damage ?? 0), 0);
}

function burning(g: Game) {
  return g.player.rooms.filter((r) => r.fire > 0);
}

describe("Large asteroid field", () => {
  it("the rock result deals 5 hull, a system bar, and 1-2 fires on one room", () => {
    let saw1 = false;
    let saw2 = false;
    let oneBar = false;
    let twoBars = false;
    let hits = 0;
    for (let seed = 1; seed <= 500 && hits < 40; seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      fillerChoose(g, ID);
      if (!g.event?.body.includes("more dangerous")) {
        assert.ok(g.player.rooms.every((r) => r.fire === 0));
        continue;
      }
      hits++;
      const rooms = burning(g);
      assert.equal(rooms.length, 1);
      assert.ok(rooms[0].fire === 1 || rooms[0].fire === 2);
      if (rooms[0].fire === 1) saw1 = true;
      else saw2 = true;
      assert.equal(g.player.hull, hull - 5);
      const dmg = bars(g);
      assert.ok(dmg === 1 || dmg === 2, String(dmg));
      if (dmg === 1) oneBar = true;
      else twoBars = true;
      assert.equal(g.phase, "event");
      assert.match(g.event.body, /[12] fires? in /);
    }
    assert.ok(hits >= 20, String(hits));
    assert.ok(saw1 && saw2);
    assert.ok(oneBar && twoBars);
  });

  it("a systemless room still burns and does not take the extra bar", () => {
    let hits = 0;
    for (let seed = 1; seed <= 300 && hits < 8; seed++) {
      const g = createGame(seed);
      for (const r of g.player.rooms) r.system = null;
      fillerChoose(g, ID);
      if (!g.event?.body.includes("more dangerous")) continue;
      hits++;
      const rooms = burning(g);
      assert.equal(rooms.length, 1);
      assert.ok(rooms[0].fire === 1 || rooms[0].fire === 2);
      assert.equal(bars(g), 1);
      assert.equal(g.player.hull, 25);
      assert.match(g.event.body, /System damage: /);
      assert.doesNotMatch(g.event.body, /1 damage to /);
    }
    assert.ok(hits >= 4, String(hits));
  });

  it("waiting does not start a fire or spend hull", () => {
    const g = createGame(1);
    fillerChoose(g, "c:large-asteroid-field:1");
    assert.ok(g.player.rooms.every((r) => r.fire === 0));
    assert.equal(g.player.hull, 30);
    assert.equal(bars(g), 0);
  });
});

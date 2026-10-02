import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HULLS } from "./hulls.ts";
import { LAYOUTS, tileCount } from "./layouts.ts";
import { createGame, sparePower } from "./sim.ts";
import { WEAPONS } from "./content.ts";

const SQUARES: Record<string, number> = {
  "kestrel-a": 48,
  "kestrel-b": 42,
  "kestrel-c": 44,
  "engi-a": 42,
  "engi-b": 32,
  "engi-c": 40,
  "fed-a": 46,
  "fed-b": 44,
  "fed-c": 46,
  "zoltan-a": 46,
  "zoltan-b": 40,
  "zoltan-c": 46,
  "slug-a": 40,
  "slug-b": 54,
  "slug-c": 42,
  "rock-a": 48,
  "rock-b": 44,
  "rock-c": 40,
  "stealth-a": 40,
  "stealth-b": 38,
  "stealth-c": 40,
  "lanius-a": 42,
  "lanius-b": 50,
};

describe("hangar hulls", () => {
  it("leaves the unlabeled start as the Lark", () => {
    const g = createGame(1);
    assert.equal(g.player.name, "Lark");
    assert.equal(g.crew[0]?.name, "Ada Voss");
    assert.equal(g.missiles, 0);
  });

  it("fits every fetched cruiser inside its reactor", () => {
    for (const hull of HULLS) {
      const g = createGame(1, hull.id);
      assert.equal(g.player.name, hull.name, hull.id);
      assert.equal(g.fuel, hull.fuel);
      assert.equal(g.missiles, hull.missiles);
      assert.equal(g.player.parts, hull.parts);
      assert.equal(g.player.reactor, hull.reactor);
      assert.ok(sparePower(g.player) >= 0, hull.id);
      const need = hull.weapons.reduce((n, id) => n + (WEAPONS[id]?.power ?? 99), 0);
      assert.ok(g.player.systems.weapons.power >= Math.min(need, g.player.systems.weapons.level), hull.id);
    }
  });

  it("gives The Kestrel the Burst Laser II and Artemis", () => {
    const g = createGame(2, "kestrel-a");
    assert.deepEqual(
      g.player.weapons.map((w) => w.defId),
      ["lineburst", "artemis"],
    );
    assert.equal(g.crew.length, 3);
    assert.equal(g.player.systems.weapons.level, 3);
  });

  it("uses the published square counts and does not overlap", () => {
    for (const [id, squares] of Object.entries(SQUARES)) {
      const layout = LAYOUTS[id];
      assert.ok(layout, id);
      assert.equal(tileCount(layout), squares, id);
      for (let i = 0; i < layout.rooms.length; i++) {
        const a = layout.rooms[i];
        assert.ok(a.x + a.w <= layout.cols && a.y + a.h <= layout.rows, id + a.id);
        for (let j = i + 1; j < layout.rooms.length; j++) {
          const b = layout.rooms[j];
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          assert.ok(apart, `${id} ${a.id} overlaps ${b.id}`);
        }
      }
      const g = createGame(1, id);
      for (const seat of HULLS.find((h) => h.id === id)?.crew ?? []) {
        assert.ok(g.player.rooms.some((r) => r.id === seat.room), `${id} ${seat.room}`);
      }
    }
  });
});

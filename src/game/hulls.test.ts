import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HULLS } from "./hulls.ts";
import { LAYOUTS, tileCount } from "./layouts.ts";
import {
  aim,
  armWeapon,
  createGame,
  depowerWeapon,
  powerMask,
  reverseSlotAuto,
  slotAutofire,
  sparePower,
  toggleAutoAll,
  toggleWeapon,
} from "./sim.ts";
import { WEAPONS } from "./content.ts";

const SQUARES: Record<string, number> = {
  // Traced cell counts from the hangar pictures. The cruiser pages do not state these.
  "kestrel-a": 51,
  "kestrel-b": 37,
  "kestrel-c": 37,
  "engi-a": 42,
  "engi-b": 32,
  "engi-c": 37,
  "fed-a": 36,
  "fed-b": 37,
  "fed-c": 32,
  "zoltan-a": 45,
  "zoltan-b": 36,
  "zoltan-c": 42,
  "slug-a": 40,
  "slug-b": 52,
  "slug-c": 42,
  "rock-a": 47,
  "rock-b": 40,
  "rock-c": 38,
  "stealth-a": 36,
  "stealth-b": 37,
  "stealth-c": 39,
  "lanius-a": 42,
  "lanius-b": 46,
  "mantis-a": 48,
  "mantis-b": 40,
  "mantis-c": 42,
  "crystal-a": 35,
  "crystal-b": 44,
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
      for (const id of hull.weapons) assert.ok(WEAPONS[id], `${hull.id} ${id}`);
      // Guns can be mounted beyond the powered bars. powerMask feeds them in list order.
      assert.equal(powerMask(g.player).length, g.player.weapons.length, hull.id);
    }
  });

  it("powers the Breach Bomb once the Anti-Bio Beam is switched off", () => {
    const g = createGame(1, "slug-a");
    assert.deepEqual(
      g.player.weapons.map((w) => w.defId),
      ["twin", "antibio", "breach1"],
    );
    assert.deepEqual(powerMask(g.player), [true, true, false]);
    toggleWeapon(g, g.player.weapons[1].uid);
    assert.deepEqual(powerMask(g.player), [true, false, true]);
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

  it("follows the Weapon Control click rules", () => {
    const g = createGame(1, "kestrel-a");
    const [first, second] = g.player.weapons;
    const room = g.player.rooms[0]?.id ?? "";
    g.enemy = g.player;
    first.charge = 0;
    assert.equal(g.targeting, false);
    // Already charging: the click enters targeting. A room click is ignored until then.
    aim(g, room);
    assert.equal(first.target, null);
    armWeapon(g, first.uid);
    assert.equal(g.armed, first.uid);
    assert.equal(g.targeting, true);
    aim(g, room);
    assert.equal(first.target, room);
    assert.equal(g.targeting, false);
    // Right click depowers and a second right click stays off.
    depowerWeapon(g, first.uid);
    assert.equal(first.enabled, false);
    depowerWeapon(g, first.uid);
    assert.equal(first.enabled, false);
    assert.equal(g.targeting, false);
    // A dark slot powers on the first click and targets on the next.
    armWeapon(g, first.uid);
    assert.equal(first.enabled, true);
    assert.equal(g.targeting, false);
    armWeapon(g, first.uid);
    assert.equal(g.targeting, true);
    // Ctrl reverses one slot against the all-weapons setting.
    assert.equal(slotAutofire(g, first), false);
    assert.equal(slotAutofire(g, second), false);
    reverseSlotAuto(g, first.uid);
    assert.equal(slotAutofire(g, first), true);
    assert.equal(slotAutofire(g, second), false);
    toggleAutoAll(g);
    assert.equal(g.autofireAll, true);
    assert.equal(slotAutofire(g, first), false);
    assert.equal(slotAutofire(g, second), true);
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

  it("keeps a traced door on a room edge", () => {
    const step = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] } as const;
    for (const [id, layout] of Object.entries(LAYOUTS)) {
      if (!layout.marks) continue;
      const at = new Map<string, string>();
      for (const r of layout.rooms) {
        for (let y = r.y; y < r.y + r.h; y++) {
          for (let x = r.x; x < r.x + r.w; x++) {
            if (r.omit?.some((cell) => cell.x === x && cell.y === y)) continue;
            at.set(`${x},${y}`, r.id);
          }
        }
      }
      const g = createGame(1, id);
      for (const mark of layout.marks) {
        const idHere = at.get(`${mark.x},${mark.y}`);
        assert.ok(idHere, `${id} ${mark.x},${mark.y} ${mark.side}`);
        const [dx, dy] = step[mark.side];
        const other = at.get(`${mark.x + dx},${mark.y + dy}`);
        const door = g.player.doors.find((d) => {
          if (!other) return d.b === "void" && (d.a === idHere);
          return (d.a === idHere && d.b === other) || (d.b === idHere && d.a === other);
        });
        assert.ok(door, `${id} missing door ${mark.x},${mark.y} ${mark.side}`);
        if (!other) assert.equal(door?.open, false, id);
        else assert.equal(door?.open, true, id);
      }
    }
  });
});

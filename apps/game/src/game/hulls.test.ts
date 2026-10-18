import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LAYOUT_FILE, SHIP_LAYOUTS } from "@stl/catalog/src/ship-layouts.ts";
import { hullDef } from "@stl/pack";
import { HULLS } from "./hulls.ts";
import { layoutFor, tileCount } from "./layouts.ts";
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
  PLAYER_SHIP_HARD: 48,
  PLAYER_SHIP_HARD_2: 42,
  PLAYER_SHIP_HARD_3: 46,
  PLAYER_SHIP_CIRCLE: 42,
  PLAYER_SHIP_CIRCLE_2: 32,
  PLAYER_SHIP_CIRCLE_3: 40,
  PLAYER_SHIP_FED: 46,
  PLAYER_SHIP_FED_2: 44,
  PLAYER_SHIP_FED_3: 46,
  PLAYER_SHIP_ENERGY: 46,
  PLAYER_SHIP_ENERGY_2: 40,
  PLAYER_SHIP_ENERGY_3: 46,
  PLAYER_SHIP_JELLY: 40,
  PLAYER_SHIP_JELLY_2: 54,
  PLAYER_SHIP_JELLY_3: 42,
  PLAYER_SHIP_ROCK: 48,
  PLAYER_SHIP_ROCK_2: 44,
  PLAYER_SHIP_ROCK_3: 40,
  PLAYER_SHIP_STEALTH: 40,
  PLAYER_SHIP_STEALTH_2: 38,
  PLAYER_SHIP_STEALTH_3: 40,
  PLAYER_SHIP_ANAEROBIC: 42,
  PLAYER_SHIP_ANAEROBIC_2: 50,
  PLAYER_SHIP_MANTIS: 54,
  PLAYER_SHIP_MANTIS_2: 46,
  PLAYER_SHIP_MANTIS_3: 56,
  PLAYER_SHIP_CRYSTAL: 54,
  PLAYER_SHIP_CRYSTAL_2: 46,
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
    const g = createGame(1, "PLAYER_SHIP_JELLY");
    assert.deepEqual(
      g.player.weapons.map((w) => w.defId),
      ["LASER_BURST_2", "BEAM_BIO", "BOMB_BREACH_1"],
    );
    assert.deepEqual(powerMask(g.player), [true, true, false]);
    toggleWeapon(g, g.player.weapons[1].uid);
    assert.deepEqual(powerMask(g.player), [true, false, true]);
  });

  it("fits the Engi B and C printed augments", () => {
    const b = HULLS.find((h) => h.id === "PLAYER_SHIP_CIRCLE_2");
    const c = HULLS.find((h) => h.id === "PLAYER_SHIP_CIRCLE_3");
    assert.ok(b);
    assert.ok(c);
    assert.deepEqual(b.augments, ["DRONE_SPEED"]);
    assert.equal(b.unfitted.includes("Drone Reactor Booster"), false);
    assert.equal(b.unfitted.includes("Anti-Personnel Drone"), true);
    assert.equal(b.unfitted.includes("System Repair Drone (second)"), false);
    assert.deepEqual(b.kits.drones?.loadout, ["REPAIR", "REPAIR"]);
    assert.deepEqual(createGame(1, "PLAYER_SHIP_CIRCLE_2").player.kits.drones?.loadout, [
      "REPAIR",
      "REPAIR",
    ]);
    assert.deepEqual(c.augments, ["DEFENSE_SCRAMBLER"]);
    assert.deepEqual(c.unfitted, []);
    assert.deepEqual(createGame(1, "PLAYER_SHIP_CIRCLE_2").augments, ["DRONE_SPEED"]);
    assert.deepEqual(createGame(1, "PLAYER_SHIP_CIRCLE_3").augments, ["DEFENSE_SCRAMBLER"]);
  });

  it("gives The Kestrel the Burst Laser II and Artemis", () => {
    const g = createGame(2, "PLAYER_SHIP_HARD");
    assert.deepEqual(
      g.player.weapons.map((w) => w.defId),
      ["LASER_BURST_3", "MISSILES_2_PLAYER"],
    );
    assert.equal(g.crew.length, 3);
    assert.equal(g.player.systems.weapons.level, 3);
  });

  it("follows the Weapon Control click rules", () => {
    const g = createGame(1, "PLAYER_SHIP_HARD");
    const [first, second] = g.player.weapons;
    const room = g.player.rooms[0]?.id ?? "";
    g.enemy = g.player;
    g.phase = "combat";
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
    // Per the user: a click on a dark slot powers it and starts targeting at once.
    armWeapon(g, first.uid);
    assert.equal(first.enabled, true);
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

  it("reads each traced interior from the loaded ship", () => {
    for (const [id, authored] of Object.entries(SHIP_LAYOUTS)) {
      const laid = layoutFor(id);
      assert.ok(laid, id);
      assert.equal(laid.cols, authored.cols, id);
      assert.equal(laid.rows, authored.rows, id);
      assert.deepEqual(
        laid.rooms.map((room) => ({
          id: room.id,
          title: room.title,
          system: room.system,
          x: room.x,
          y: room.y,
          w: room.w,
          h: room.h,
          reserve: room.reserve,
        })),
        authored.rooms.map((room) => ({
          id: room.id,
          title: room.title,
          system: room.system,
          x: room.x,
          y: room.y,
          w: room.w,
          h: room.h,
          reserve: room.reserve,
        })),
        id,
      );
      assert.deepEqual(laid.marks, authored.marks, id);
      const hull = hullDef(id);
      assert.equal(hull?.layout, LAYOUT_FILE[id], id);
      for (const room of authored.rooms) {
        if (!room.system) continue;
        assert.ok(hull?.systems[room.system], `${id} ${room.id} ${room.system}`);
      }
    }
  });

  it("uses the published square counts and does not overlap", () => {
    for (const [id, squares] of Object.entries(SQUARES)) {
      const layout = layoutFor(id);
      assert.ok(layout, id);
      assert.equal(tileCount(layout), squares, id);
      for (let i = 0; i < layout.rooms.length; i++) {
        const a = layout.rooms[i];
        assert.ok(a.x + a.w <= layout.cols && a.y + a.h <= layout.rows, id + a.id);
        for (let j = i + 1; j < layout.rooms.length; j++) {
          const b = layout.rooms[j];
          const apart =
            a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          assert.ok(apart, `${id} ${a.id} overlaps ${b.id}`);
        }
      }
      const g = createGame(1, id);
      for (const seat of HULLS.find((h) => h.id === id)?.crew ?? []) {
        assert.ok(
          g.player.rooms.some((r) => r.id === seat.room),
          `${id} ${seat.room}`,
        );
      }
    }
  });

  it("keeps a traced door on a room edge", () => {
    const step = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] } as const;
    for (const [id, layout] of Object.entries(SHIP_LAYOUTS)) {
      if (!layout.marks) continue;
      const at = new Map<string, string>();
      for (const r of layout.rooms) {
        for (let y = r.y; y < r.y + r.h; y++) {
          for (let x = r.x; x < r.x + r.w; x++) at.set(`${x},${y}`, r.id);
        }
      }
      const g = createGame(1, id);
      for (const mark of layout.marks) {
        const idHere = at.get(`${mark.x},${mark.y}`);
        assert.ok(idHere, `${id} ${mark.x},${mark.y} ${mark.side}`);
        const [dx, dy] = step[mark.side];
        const other = at.get(`${mark.x + dx},${mark.y + dy}`);
        const door = g.player.doors.find((d) => {
          if (!other) return d.b === "void" && d.a === idHere;
          return (d.a === idHere && d.b === other) || (d.b === idHere && d.a === other);
        });
        assert.ok(door, `${id} missing door ${mark.x},${mark.y} ${mark.side}`);
        assert.equal(door?.open, false, `${id} ${mark.x},${mark.y} ${mark.side}`);
      }
    }
  });
});

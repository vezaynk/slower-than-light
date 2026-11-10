import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { START_FUEL, hullDef, startingFit, weaponDef } from "@stl/pack";
import type { StartingFit } from "@stl/pack";
import { powerGuns } from "./fixtures.ts";
import { playerHulls } from "./hulls.ts";
import { layoutFor, tileCount } from "./layouts.ts";
import "./pack/base.ts";
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

/** Archive layout file each player ship names. Kestrel's stem is spelled kestral. */
const LAYOUT_STEM: Record<string, string> = {
  PLAYER_SHIP_HARD: "kestral",
  PLAYER_SHIP_HARD_2: "kestral_2",
  PLAYER_SHIP_HARD_3: "kestral_3",
  PLAYER_SHIP_CIRCLE: "circle_cruiser",
  PLAYER_SHIP_CIRCLE_2: "circle_cruiser_2",
  PLAYER_SHIP_CIRCLE_3: "circle_cruiser_3",
  PLAYER_SHIP_FED: "fed_cruiser",
  PLAYER_SHIP_FED_2: "fed_cruiser_2",
  PLAYER_SHIP_FED_3: "fed_cruiser_3",
  PLAYER_SHIP_ENERGY: "energy_cruiser",
  PLAYER_SHIP_ENERGY_2: "energy_cruiser_2",
  PLAYER_SHIP_ENERGY_3: "energy_cruiser_3",
  PLAYER_SHIP_JELLY: "jelly_cruiser",
  PLAYER_SHIP_JELLY_2: "jelly_cruiser_2",
  PLAYER_SHIP_JELLY_3: "jelly_cruiser_3",
  PLAYER_SHIP_ROCK: "rock_cruiser",
  PLAYER_SHIP_ROCK_2: "rock_cruiser_2",
  PLAYER_SHIP_ROCK_3: "rock_cruiser_3",
  PLAYER_SHIP_STEALTH: "stealth",
  PLAYER_SHIP_STEALTH_2: "stealth_2",
  PLAYER_SHIP_STEALTH_3: "stealth_3",
  PLAYER_SHIP_ANAEROBIC: "anaerobic_cruiser",
  PLAYER_SHIP_ANAEROBIC_2: "anaerobic_cruiser_2",
  PLAYER_SHIP_MANTIS: "mantis_cruiser",
  PLAYER_SHIP_MANTIS_2: "mantis_cruiser_2",
  PLAYER_SHIP_MANTIS_3: "mantis_cruiser_3",
  PLAYER_SHIP_CRYSTAL: "crystal_cruiser",
  PLAYER_SHIP_CRYSTAL_2: "crystal_cruiser_2",
};

const SUBSYSTEMS = new Set(["pilot", "sensors", "doors"]);

/** Bars a system asks for before the reactor runs out. Weapons and drones start off. Shields fill. */
function askedBars(id: string, level: number): number {
  if (id === "shields") return level;
  if (id === "weapons" || id === "drones") return 0;
  if (id === "battery" || SUBSYSTEMS.has(id)) return 0;
  return Math.min(1, level);
}

/**
 * Reactor hand-out in ShipSystem order.
 * Pilot, sensors, and doors store bars equal to their level and draw nothing.
 * The battery is unpowered: its kit power stays 0 (the level is the charge it can give).
 * Weapons and drones start at 0. Shields fill to their level. Other reactor systems take min(1, level)
 * until the reactor is spent. That is not the old inferred weapon fill such as [3, 3].
 */
function expectBars(fit: StartingFit, reactor: number): void {
  const order = [
    "shields",
    "engines",
    "oxygen",
    "weapons",
    "drones",
    "medbay",
    "pilot",
    "sensors",
    "doors",
    "teleporter",
    "cloaking",
    "artillery",
    "battery",
    "clonebay",
    "mind",
    "hacking",
  ];
  let left = reactor;
  const got = new Map<string, number>();
  const levelOf = (id: string): number | undefined => {
    const sys = fit.systems[id];
    if (sys) return sys[0];
    return fit.kits[id]?.level;
  };
  for (const id of order) {
    const level = levelOf(id);
    if (level == null) continue;
    if (SUBSYSTEMS.has(id)) {
      got.set(id, level);
      continue;
    }
    const want = Math.min(askedBars(id, level), Math.max(0, left));
    got.set(id, want);
    left -= want;
  }
  for (const [id, pair] of Object.entries(fit.systems)) {
    assert.equal(pair[1], got.get(id), id);
  }
  for (const [id, kit] of Object.entries(fit.kits)) {
    if (!kit) continue;
    assert.equal(kit.power, got.get(id) ?? 0, id);
  }
}

describe("hangar hulls", () => {
  it("leaves the unlabeled start as the Lark", () => {
    const g = createGame(1);
    assert.equal(g.player.name, "Lark");
    assert.equal(g.crew[0]?.name, "Ada Voss");
    assert.equal(g.missiles, 0);
  });

  it("fits every fetched cruiser inside its reactor", () => {
    for (const hull of playerHulls()) {
      const g = createGame(1, hull.id);
      assert.equal(g.player.name, hull.name, hull.id);
      assert.equal(hull.fuel, START_FUEL, hull.id);
      assert.equal(g.fuel, START_FUEL, hull.id);
      assert.equal(g.missiles, hull.missiles);
      assert.equal(g.player.parts, hull.parts);
      assert.equal(g.player.reactor, hull.reactor);
      assert.ok(sparePower(g.player) >= 0, hull.id);
      for (const id of hull.weapons) assert.ok(weaponDef(id), `${hull.id} ${id}`);
      // Guns can be mounted beyond the powered bars. powerMask feeds them in list order.
      assert.equal(powerMask(g.player).length, g.player.weapons.length, hull.id);
      const spec = hullDef(hull.id);
      assert.ok(spec, hull.id);
      const fit = startingFit(spec);
      expectBars(fit, spec.reactor);
      if (fit.systems.weapons) assert.equal(fit.systems.weapons[1], 0, hull.id);
      if (fit.kits.drones) assert.equal(fit.kits.drones.power, 0, hull.id);
      if (fit.systems.shields)
        assert.equal(fit.systems.shields[1], fit.systems.shields[0], hull.id);
      for (const id of SUBSYSTEMS) {
        const pair = fit.systems[id];
        if (pair) assert.equal(pair[1], pair[0], `${hull.id} ${id}`);
      }
      if (fit.kits.battery) assert.equal(fit.kits.battery.power, 0, hull.id);
      assert.equal(g.player.systems.weapons.power, fit.systems.weapons?.[1] ?? 0, hull.id);
      assert.equal(g.player.systems.shields.power, fit.systems.shields?.[1] ?? 0, hull.id);
    }
    const kestrel = hullDef("PLAYER_SHIP_HARD");
    assert.ok(kestrel);
    assert.equal(kestrel.layout, "kestral");
    assert.deepEqual(startingFit(kestrel).systems.weapons, [3, 0]);
    assert.notDeepEqual(startingFit(kestrel).systems.weapons, [3, 3]);
  });

  it("powers the Breach Bomb once the Anti-Bio Beam is switched off", () => {
    const g = powerGuns(createGame(1, "PLAYER_SHIP_JELLY"));
    assert.deepEqual(
      g.player.weapons.map((w) => w.defId),
      ["LASER_BURST_2", "BEAM_BIO", "BOMB_BREACH_1"],
    );
    // Three spare bars: the burst laser and the beam. The bomb has no bar left.
    assert.deepEqual(powerMask(g.player), [true, true, false]);
    toggleWeapon(g, g.player.weapons[1].uid);
    toggleWeapon(g, g.player.weapons[2].uid);
    assert.deepEqual(powerMask(g.player), [true, false, true]);
  });

  it("fits the Engi B and C printed augments", () => {
    const b = playerHulls().find((h) => h.id === "PLAYER_SHIP_CIRCLE_2");
    const c = playerHulls().find((h) => h.id === "PLAYER_SHIP_CIRCLE_3");
    assert.ok(b);
    assert.ok(c);
    assert.deepEqual(b.augments, ["DRONE_SPEED"]);
    assert.equal(b.unfitted.includes("Drone Reactor Booster"), false);
    assert.equal(b.unfitted.includes("Anti-Personnel Drone"), true);
    assert.equal(b.unfitted.includes("System Repair Drone (second)"), false);
    // The blueprint lists both repair drones and the Anti-Personnel schematic. The ship flies only the repair pair.
    assert.deepEqual(b.kits.drones?.loadout, ["REPAIR", "REPAIR", "BATTLE"]);
    assert.equal(b.kits.drones?.power, 0);
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
    for (const [id, stem] of Object.entries(LAYOUT_STEM)) {
      const hull = hullDef(id);
      assert.equal(hull?.layout, stem, id);
      const laid = layoutFor(id);
      assert.ok(laid, id);
      assert.ok(laid.cols >= 1 && laid.rows >= 1, id);
      const halls = laid.rooms.filter((room) => room.system == null && !room.reserve);
      halls.forEach((room, index) => assert.equal(room.id, `p-hall${index}`, id));
      for (const room of laid.rooms) {
        assert.ok(room.x + room.w <= laid.cols && room.y + room.h <= laid.rows, id + room.id);
        assert.ok(room.w > 0 && room.h > 0, id + room.id);
        if (!room.system) continue;
        assert.ok(
          hull && startingFit(hull).systems[room.system],
          `${id} ${room.id} ${room.system}`,
        );
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
      for (const seat of playerHulls().find((h) => h.id === id)?.crew ?? []) {
        assert.ok(
          g.player.rooms.some((r) => r.id === seat.room),
          `${id} ${seat.room}`,
        );
      }
    }
  });

  it("keeps a traced door on a room edge", () => {
    const step = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] } as const;
    for (const id of Object.keys(LAYOUT_STEM)) {
      const layout = layoutFor(id);
      if (!layout?.marks?.length) continue;
      const g = createGame(1, id);
      const at = new Map<string, string>();
      for (const r of layout.rooms) {
        for (let y = r.y; y < r.y + r.h; y++) {
          for (let x = r.x; x < r.x + r.w; x++) at.set(`${x},${y}`, r.id);
        }
      }
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

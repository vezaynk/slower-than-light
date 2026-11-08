import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { hullDef, loadPack, onPackWarning, resetPackForTests } from "@stl/pack";
import type { HullDef } from "@stl/pack";
import { installStandIn } from "@stl/standin";
import "./pack/base.ts";
import { installArchive } from "./archive-play.ts";
import { enemyHulls, specFromHull } from "./enemy-gen.ts";
import type { EnemySpec } from "./enemy-gen.ts";

const dat = process.env.FTL_DAT?.trim();

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const ctx = (sector: number, difficulty: "easy" | "normal" | "hard") => ({
  sector,
  sectorId: "CIVILIAN_SECTOR",
  sectorName: "Civilian Sector",
  difficulty,
});

/**
 * Rooms of the spec that are not on the hull: not one of the layout's own room boxes (each used once), or outside the
 * layout's cols/rows. Edge adjacency is no test: the auto-ships' traced rooms stand apart (AUTO_ASSAULT's pilot).
 */
function offHull(hull: HullDef, spec: EnemySpec): string[] {
  const grid = hull.grid;
  const boxes = (grid?.rooms ?? [])
    .filter((room) => room.w > 0 || room.h > 0)
    .map((room) => ({ x: room.x, y: room.y, w: Math.max(1, room.w), h: Math.max(1, room.h) }));
  if (boxes.length === 0) return [];
  const bad: string[] = [];
  const used = new Set<number>();
  for (const room of spec.rooms) {
    const at = boxes.findIndex(
      (box, i) =>
        !used.has(i) &&
        box.x === room.x &&
        box.y === room.y &&
        box.w === room.w &&
        box.h === room.h,
    );
    if (at >= 0) used.add(at);
    const own = at >= 0;
    const inside =
      (grid?.cols == null || room.x + room.w <= grid.cols) &&
      (grid?.rows == null || room.y + room.h <= grid.rows);
    if (!own || !inside) bad.push(`${room.id}@${room.x},${room.y}`);
  }
  return bad;
}

/** The room id a fitted install shows as (enemy-gen.ts FROM_INSTALL: ftl.dat's `mind` is mind control). */
const roomId = (install: string) => `e-${install === "mind" ? "mindcontrol" : install}`;

/**
 * Every enemy blueprint over sectors, difficulties and seeds: the rooms off the hull, the installs no ship ever fitted,
 * and the warnings.
 */
function sweep(): { bad: string[]; unfitted: string[]; warnings: string[]; ships: number } {
  const warnings: string[] = [];
  const restore = onPackWarning((message) => warnings.push(message));
  const bad: string[] = [];
  const unfitted: string[] = [];
  let ships = 0;
  try {
    for (const hull of enemyHulls()) {
      const seen = new Set<string>();
      for (const sector of [1, 4, 8]) {
        for (const difficulty of ["easy", "normal", "hard"] as const) {
          for (let seed = 1; seed <= 6; seed++) {
            const spec = specFromHull(hull, ctx(sector, difficulty), seeded(seed * 7919 + sector));
            ships++;
            for (const room of spec.rooms) seen.add(room.id);
            const off = offHull(hull, spec);
            if (off.length)
              bad.push(`${hull.id} s${sector} ${difficulty} #${seed}: ${off.join(" ")}`);
          }
        }
      }
      // Every system the blueprint lists is fitted on some ship: none is left off for want of a room.
      if (!hull.grid?.rooms.length) continue;
      for (const install of hull.installs ?? []) {
        if (install.power >= 1 && !seen.has(roomId(install.id)))
          unfitted.push(`${hull.id} ${install.id}`);
      }
    }
  } finally {
    restore();
  }
  return { bad, unfitted, warnings, ships };
}

/** A three-room test hull with these installs, appended to the loaded pack. */
function testHull(id: string, installs: HullDef["installs"]): HullDef {
  const base = enemyHulls().find((hull) => (hull.grid?.rooms.length ?? 0) >= 3);
  assert.ok(base?.grid);
  loadPack({ hulls: [{ ...base, id, installs }] }, "append");
  return hullDef(id)!;
}

describe("enemy rooms stay on the hull", () => {
  it("seats every system of every stand-in enemy blueprint in one of its layout's rooms, with no warning", () => {
    const { bad, unfitted, warnings, ships } = sweep();
    assert.ok(ships > 100, `only ${ships} ships`);
    assert.deepEqual(bad, []);
    assert.deepEqual(unfitted, []);
    assert.deepEqual(
      warnings.filter((message) => /not fitted/.test(message)),
      [],
    );
  });

  it("leaves out a system with no room, or in a starting system's room, before the budget is spent", () => {
    // As ftl.dat's BOSS_SPECIAL: a starting teleporter and an optional mind control both in room 1. Plus a cloak with
    // no room. Both have upgrade room, so bars spent on them would show.
    const keep: HullDef["installs"] = [
      { id: "pilot", power: 1, max: 3, start: true, room: 0 },
      { id: "teleporter", power: 1, max: 3, start: true, room: 1 },
      { id: "shields", power: 1, max: 8, start: true, room: 2 },
    ];
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const plain = testHull("PLAIN_TEST", keep);
      const crowded = testHull("CROWDED_TEST", [
        ...keep,
        { id: "mind", power: 1, max: 3, start: false, room: 1 },
        { id: "cloaking", power: 1, max: 3, start: true },
      ]);
      for (let seed = 1; seed <= 12; seed++) {
        const spec = specFromHull(crowded, ctx(8, "hard"), seeded(seed));
        assert.deepEqual(offHull(crowded, spec), []);
        const ids = spec.rooms.map((room) => room.id);
        assert.ok(ids.includes("e-teleporter"), ids.join());
        assert.ok(!ids.includes("e-mindcontrol") && !ids.includes("e-cloaking"), ids.join());
        assert.equal(spec.boards, true);
        assert.equal(spec.kits.mind, undefined);
        assert.equal(spec.kits.cloaking, undefined);
        // The ship is the one the blueprint without them makes: the same levels, reactor and rolls.
        const same = specFromHull(plain, ctx(8, "hard"), seeded(seed));
        assert.deepEqual({ ...spec, classId: same.classId, name: same.name }, same);
      }
      assert.deepEqual(warnings.filter((message) => message.includes("CROWDED_TEST")).sort(), [
        'CROWDED_TEST: system "cloaking" has no room; it is not fitted.',
        'CROWDED_TEST: system "mindcontrol" is in room 1, which teleporter holds; it is not fitted.',
      ]);
    } finally {
      restore();
      resetPackForTests();
    }
  });

  it("fits one of two optional systems that share a room, with no warning", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const hull = testHull("PAIRED_TEST", [
        { id: "pilot", power: 1, start: true, room: 0 },
        { id: "hacking", power: 1, max: 3, start: false, room: 1 },
        { id: "doors", power: 1, max: 3, start: false, room: 1 },
      ]);
      const seen = new Set<string>();
      for (let seed = 1; seed <= 60; seed++) {
        const spec = specFromHull(hull, ctx(1 + (seed % 8), "normal"), seeded(seed));
        assert.deepEqual(offHull(hull, spec), []);
        const ids = spec.rooms.map((room) => room.id);
        assert.ok(!(ids.includes("e-hacking") && ids.includes("e-doors")), ids.join());
        for (const id of ids) seen.add(id);
      }
      assert.ok(seen.has("e-hacking") && seen.has("e-doors"), [...seen].join());
      assert.deepEqual(
        warnings.filter((message) => message.includes("PAIRED_TEST")),
        [],
      );
    } finally {
      restore();
      resetPackForTests();
    }
  });
});

describe(
  "ftl.dat enemy rooms stay on the hull",
  {
    skip: dat ? false : "FTL_DAT is unset",
    timeout: 300_000,
  },
  () => {
    after(async () => {
      await installStandIn();
    });

    it("seats every ftl.dat enemy blueprint's systems in its layout's rooms", async () => {
      await installArchive(new Uint8Array(readFileSync(dat!)));
      const { bad, unfitted, warnings, ships } = sweep();
      assert.ok(ships > 100, `only ${ships} ships`);
      assert.deepEqual(bad, []);
      assert.deepEqual(unfitted, []);
      assert.deepEqual(
        warnings.filter((message) => /not fitted/.test(message)),
        [],
      );
      // The Flagship Construction fight: the optional mind control shares the starting teleporter's room 3, so it is
      // left out and the teleporter boards.
      const boss = hullDef("BOSS_SPECIAL");
      assert.ok(boss);
      const seen: string[] = [];
      const restore = onPackWarning((message) => seen.push(message));
      try {
        for (let seed = 1; seed <= 20; seed++) {
          const spec = specFromHull(boss, ctx(8, "hard"), seeded(seed));
          assert.deepEqual(offHull(boss, spec), []);
          const ids = spec.rooms.map((room) => room.id);
          assert.ok(ids.includes("e-teleporter") && !ids.includes("e-mindcontrol"), ids.join());
          assert.equal(spec.boards, true);
          assert.equal(spec.kits.mind, undefined);
        }
      } finally {
        restore();
      }
      assert.deepEqual(
        seen.filter((message) => message.startsWith("BOSS_SPECIAL")),
        [
          'BOSS_SPECIAL: system "mindcontrol" is in room 3, which teleporter holds; it is not fitted.',
        ],
      );
    });
  },
);

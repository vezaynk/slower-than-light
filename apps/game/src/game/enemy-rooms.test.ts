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

/** Every enemy blueprint over sectors, difficulties and seeds: the rooms off the hull, and the warnings. */
function sweep(): { bad: string[]; warnings: string[]; ships: number } {
  const warnings: string[] = [];
  const restore = onPackWarning((message) => warnings.push(message));
  const bad: string[] = [];
  let ships = 0;
  try {
    for (const hull of enemyHulls()) {
      for (const sector of [1, 4, 8]) {
        for (const difficulty of ["easy", "normal", "hard"] as const) {
          for (let seed = 1; seed <= 6; seed++) {
            const spec = specFromHull(hull, ctx(sector, difficulty), seeded(seed * 7919 + sector));
            ships++;
            const off = offHull(hull, spec);
            if (off.length)
              bad.push(`${hull.id} s${sector} ${difficulty} #${seed}: ${off.join(" ")}`);
          }
        }
      }
    }
  } finally {
    restore();
  }
  return { bad, warnings, ships };
}

describe("enemy rooms stay on the hull", () => {
  it("seats every system of every stand-in enemy blueprint in one of its layout's rooms, with no warning", () => {
    const { bad, warnings, ships } = sweep();
    assert.ok(ships > 100, `only ${ships} ships`);
    assert.deepEqual(bad, []);
    assert.deepEqual(
      warnings.filter((message) => /not fitted/.test(message)),
      [],
    );
  });

  it("warns once for a system with no room, or whose room another fitted system holds, and leaves it out", () => {
    const base = enemyHulls().find((hull) => (hull.grid?.rooms.length ?? 0) >= 3);
    assert.ok(base?.grid);
    // As ftl.dat's BOSS_SPECIAL: teleporter and mind control both in room 3. Plus a cloak with no room.
    loadPack(
      {
        hulls: [
          {
            ...base,
            id: "CROWDED_TEST",
            installs: [
              { id: "pilot", power: 1, start: true, room: 0 },
              { id: "teleporter", power: 1, start: true, room: 1 },
              { id: "mind", power: 1, start: true, room: 1 },
              { id: "cloaking", power: 1, start: true },
            ],
          },
        ],
      },
      "append",
    );
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const hull = hullDef("CROWDED_TEST")!;
      for (let seed = 1; seed <= 3; seed++) {
        const spec = specFromHull(hull, ctx(3, "normal"), seeded(seed));
        assert.deepEqual(offHull(hull, spec), []);
        assert.equal(spec.rooms.length, hull.grid!.rooms.length);
        const ids = spec.rooms.map((room) => room.id);
        assert.ok(ids.includes("e-teleporter"), ids.join());
        assert.ok(!ids.includes("e-mindcontrol") && !ids.includes("e-cloaking"), ids.join());
        assert.equal(spec.kits.mind, undefined);
        assert.equal(spec.kits.cloaking, undefined);
        // The dropped systems draw no reactor power.
        assert.equal(spec.reactor, 2);
      }
      assert.deepEqual(warnings.filter((message) => message.includes("CROWDED_TEST")).sort(), [
        'CROWDED_TEST: system "cloaking" has no room; it is not fitted.',
        'CROWDED_TEST: system "mindcontrol" is in room 1, which another system holds or the layout lacks; it is not fitted.',
      ]);
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
      const { bad, warnings, ships } = sweep();
      assert.ok(ships > 100, `only ${ships} ships`);
      assert.deepEqual(bad, []);
      assert.deepEqual(
        warnings.filter((message) => /not fitted/.test(message)),
        [],
      );
      // The Flagship Construction fight: teleporter and mind control share room 3, so one of them is not fitted.
      const boss = hullDef("BOSS_SPECIAL");
      assert.ok(boss);
      const seen: string[] = [];
      const restore = onPackWarning((message) => seen.push(message));
      try {
        for (let seed = 1; seed <= 20; seed++) {
          const spec = specFromHull(boss, ctx(8, "hard"), seeded(seed));
          assert.deepEqual(offHull(boss, spec), []);
        }
      } finally {
        restore();
      }
      assert.ok(
        seen.some((message) =>
          /^BOSS_SPECIAL: system "(teleporter|mindcontrol)" is in room 3/.test(message),
        ),
        seen.join("\n"),
      );
    });
  },
);

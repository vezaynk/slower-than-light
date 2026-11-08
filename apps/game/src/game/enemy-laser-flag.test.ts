import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { allWeapons, hullDef, loadPack, resetPackForTests, weaponDef } from "@stl/pack";
import type { WeaponBlueprint } from "@stl/pack";
import { installStandIn } from "@stl/standin";
import "./pack/base.ts";
import { installArchive } from "./archive-play.ts";
import { arm, laserFlag, specFromHull } from "./enemy-gen.ts";

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const dat = process.env.FTL_DAT?.trim();

/** Mathchamp: "a weapon that is either a LASER, or is a MISSILE with at most 3 shield piercing". */
function expected(row: WeaponBlueprint): boolean {
  if (row.kind === "laser" || row.kind === "ion") return true;
  return row.kind === "missile" && (row.pierce ?? 0) <= 3;
}

describe("enemy generation's laser flag (Mathchamp, Details on enemy ship generation)", () => {
  it("reads the weapon's archive type and <sp> on the stand-in", () => {
    for (const row of allWeapons()) assert.equal(laserFlag(row.id), expected(row), row.id);
    // "In vanilla, this is met by lasers, ions, and crystal weapons."
    for (const id of ["LASER_BURST_1", "ION_1", "CRYSTAL_BURST_1", "CRYSTAL_HEAVY_2"])
      assert.equal(laserFlag(id), true, id);
    for (const id of ["MISSILES_1", "MISSILES_2", "BOMB_1", "BEAM_1"])
      assert.equal(laserFlag(id), false, id);
    // Every stand-in missile writes <sp>5</sp>, as ftl.dat's do.
    for (const row of allWeapons().filter((w) => w.kind === "missile"))
      assert.equal(row.pierce, 5, row.id);
    // Ammo missiles fly past every layer in the sim, so the card does not print that <sp>.
    for (const row of allWeapons().filter((w) => w.kind === "missile" && w.ammo))
      assert.doesNotMatch(`${row.blurb} ${row.detail ?? ""}`, /pierces/i, row.id);
    assert.match(weaponDef("CRYSTAL_BURST_1")!.detail ?? "", /Pierces 1 shield layer/);
    assert.equal(laserFlag("NO_SUCH_GUN"), false);
  });

  it("counts a MISSILE up to 3 shield piercing, and not past it", () => {
    // Three power, so a level-8 system draws a second gun when the flags allow it.
    const base = { ...weaponDef("MISSILES_2")!, power: 3 };
    const { pierce: _drop, ...bare } = base;
    loadPack(
      {
        weapons: [
          { ...base, id: "SP_THREE", pierce: 3 },
          { ...base, id: "SP_FOUR", pierce: 4 },
          { ...bare, id: "SP_NONE" },
          { ...weaponDef("BOMB_1")!, id: "BOMB_SP_ONE", pierce: 1 },
        ],
      },
      "append",
    );
    try {
      assert.equal(laserFlag("SP_THREE"), true);
      assert.equal(laserFlag("SP_FOUR"), false);
      // Absent <sp> is no piercing.
      assert.equal(laserFlag("SP_NONE"), true);
      // A bomb is not a MISSILE, whatever its <sp>.
      assert.equal(laserFlag("BOMB_SP_ONE"), false);
      // The flag closes on a piercing-1 missile, so the draw keeps going past it.
      const out = arm(["SP_THREE"], 8, seeded(1)).weapons;
      assert.ok(out.length > 1, `${out}`);
      // A piercing-5 missile only closes the hull flag; the laser flag stays open and stops the draw.
      assert.deepEqual(arm(["SP_FOUR"], 8, seeded(1)).weapons, ["SP_FOUR"]);
    } finally {
      resetPackForTests();
    }
  });
});

describe(
  "ftl.dat's crystal guns and the laser flag",
  {
    skip: dat ? false : "FTL_DAT is unset",
    timeout: 120_000,
  },
  () => {
    after(async () => {
      await installStandIn();
    });

    it("counts the MISSILES-typed crystals, so crystal ships draw past their first gun", async () => {
      await installArchive(new Uint8Array(readFileSync(dat!)));
      for (const id of [
        "CRYSTAL_BURST_1",
        "CRYSTAL_BURST_2",
        "CRYSTAL_HEAVY_1",
        "CRYSTAL_HEAVY_2",
      ]) {
        assert.equal(weaponDef(id)?.kind, "missile", id);
        assert.equal(weaponDef(id)?.pierce, 1, id);
        assert.equal(laserFlag(id), true, id);
      }
      for (const id of ["MISSILES_1", "MISSILES_2", "MISSILES_3", "MISSILES_BREACH", "BOMB_LOCK"])
        assert.equal(laserFlag(id), false, id);
      // ION_1 is <type>LASER</type> in ftl.dat.
      assert.equal(laserFlag("ION_1"), true);
      for (const row of allWeapons()) assert.equal(laserFlag(row.id), expected(row), row.id);

      // WEAPONS_CRYSTAL holds only crystals and BOMB_LOCK. With the crystals failing the flag, every ship stopped at one gun.
      for (const id of ["CRYSTAL_SCOUT", "CRYSTAL_BOMBER"]) {
        const hull = hullDef(id)!;
        let multi = 0;
        for (let seed = 1; seed <= 20; seed++) {
          const spec = specFromHull(
            hull,
            {
              sector: 5,
              sectorId: "CIVILIAN_SECTOR",
              sectorName: "Civilian Sector",
              difficulty: "normal",
            },
            seeded(seed),
          );
          if (spec.weapons.length > 1) multi++;
        }
        assert.ok(multi > 10, `${id}: ${multi} of 20 ships carry more than one gun`);
      }
    });
  },
);

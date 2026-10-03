import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEAPONS } from "./content.ts";
import { DRONE_LOOKS, WEAPON_LOOKS, droneKeyForName, dronePixels, weaponIdForName, weaponPixels, type DroneKey, type PixelArt } from "./gear-look.ts";
import { MISSING_DRONES } from "./wiki/drones-missing.ts";
import { CRUISER_PAGES } from "./wiki/layout-pages.ts";
import { hangarSheet } from "./wiki/hangar-sheet.ts";

function signature(art: PixelArt) {
  return `${art.rows.join("/")}|${art.palette.body}|${art.palette.trim}|${art.palette.glow}`;
}

function shape(art: PixelArt) {
  return art.rows.join("/");
}

describe("gear art", () => {
  it("gives every fitted weapon its own look", () => {
    assert.deepEqual(Object.keys(WEAPONS).filter((id) => !WEAPON_LOOKS[id]), []);
    const seen = new Map<string, string>();
    for (const id of Object.keys(WEAPONS)) {
      const sig = signature(weaponPixels(id));
      assert.equal(seen.get(sig), undefined, `${id} draws the same as ${seen.get(sig)}`);
      seen.set(sig, id);
    }
  });

  it("gives every drone its own look and shape", () => {
    const keys = Object.keys(DRONE_LOOKS) as DroneKey[];
    const sigs = new Set(keys.map((key) => signature(dronePixels(key))));
    assert.equal(sigs.size, keys.length);
    const shapes = new Set(keys.map((key) => shape(dronePixels(key))));
    assert.equal(shapes.size, keys.length, "two drones share a silhouette");
  });

  it("keeps every weapon silhouette apart, not just their colours", () => {
    const ids = Object.keys(WEAPONS);
    const shapes = new Set(ids.map((id) => shape(weaponPixels(id))));
    assert.equal(shapes.size, ids.length, "two weapons share a silhouette");
  });

  it("resolves every hangar weapon and drone name", () => {
    const weapons = new Set<string>();
    const drones = new Set<string>();
    for (const page of CRUISER_PAGES) {
      for (const layout of page.layouts) {
        const sheet = hangarSheet(layout);
        sheet.weapons.filter((name) => name !== "none").forEach((name) => weapons.add(name));
        sheet.drones.filter((name) => !/^none\b/i.test(name)).forEach((name) => drones.add(name));
      }
    }
    assert.deepEqual([...weapons].filter((name) => !weaponIdForName(name)), []);
    assert.deepEqual([...drones].filter((name) => !droneKeyForName(name)), []);
    assert.deepEqual(MISSING_DRONES.map((row) => row.name).filter((name) => !droneKeyForName(name)), []);
  });
});

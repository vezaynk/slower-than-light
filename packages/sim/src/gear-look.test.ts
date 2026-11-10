import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allWeapons } from "@stl/pack";
import "./pack/base.ts";
import {
  DRONE_LOOKS,
  WEAPON_LOOKS,
  dronePixels,
  weaponPixels,
  type DroneKey,
  type PixelArt,
} from "./gear-look.ts";

function signature(art: PixelArt) {
  return `${art.rows.join("/")}|${art.palette.body}|${art.palette.trim}|${art.palette.glow}`;
}

function shape(art: PixelArt) {
  return art.rows.join("/");
}

/** Fitted weapons. A drone's gun names no weaponArt: it is never mounted, so it has no look. */
function weaponIds(): string[] {
  return allWeapons()
    .filter((weapon) => weapon.art)
    .map((weapon) => weapon.id);
}

describe("gear art", () => {
  it("gives every fitted weapon its own look", () => {
    assert.deepEqual(
      weaponIds().filter((id) => !WEAPON_LOOKS[id]),
      [],
    );
    const seen = new Map<string, string>();
    for (const id of weaponIds()) {
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

  it("gives every weapon a glow accent that can light when charged", () => {
    for (const id of weaponIds()) {
      assert.equal(
        weaponPixels(id).rows.some((row) => row.includes("g")),
        true,
        `${id} has no glow pixel`,
      );
    }
  });

  it("keeps every weapon silhouette apart, not just their colours", () => {
    const ids = weaponIds();
    const shapes = new Set(ids.map((id) => shape(weaponPixels(id))));
    assert.equal(shapes.size, ids.length, "two weapons share a silhouette");
  });
});

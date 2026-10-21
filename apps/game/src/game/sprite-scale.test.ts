import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROOM_PX } from "@stl/pack";
import { GUN_ART, muzzlePoint } from "./mount-place.ts";
import {
  DRONE_SHEET_FIT,
  archiveScale,
  barrelPoint,
  droneIconSide,
  frameBox,
  projectileHeading,
  weaponSlotBox,
} from "./sprite-scale.ts";

const TILE = 44;

describe("archive sprite scale", () => {
  it("maps one archive room onto the board tile", () => {
    assert.equal(archiveScale(ROOM_PX), 1);
    assert.equal(archiveScale(TILE), TILE / ROOM_PX);
    // Crew, fire, and a drone sheet keep their archive box, grown with the tile.
    assert.deepEqual(frameBox(35, 35, TILE), { w: TILE, h: TILE });
    assert.deepEqual(frameBox(32, 32, TILE), {
      w: 32 * (TILE / ROOM_PX),
      h: 32 * (TILE / ROOM_PX),
    });
    assert.deepEqual(frameBox(64, 64, TILE), {
      w: 64 * (TILE / ROOM_PX),
      h: 64 * (TILE / ROOM_PX),
    });
  });

  it("turns a tall weapon sheet so the barrel matches the stand-in length", () => {
    const height = 24;
    const standIn = weaponSlotBox(GUN_ART.w, GUN_ART.h, height);
    assert.equal(standIn.turned, false);
    assert.equal(standIn.h, height);
    assert.equal(standIn.w, (height * GUN_ART.w) / GUN_ART.h);
    // Burst Laser I is a 16×60 sheet and points up. The barrel matches the stand-in length.
    const laser = weaponSlotBox(16, 60, height);
    assert.equal(laser.turned, true);
    assert.equal(laser.w, standIn.w);
    assert.ok(laser.h < height);
    assert.ok(laser.h > 8);
  });

  it("sends a right-pointing hardpoint's shot out of the muzzle", () => {
    // Burst Laser I: mount near the bottom of the sheet, muzzle toward the top.
    const mount = { x: 2, y: 44 };
    const fire = { x: 10, y: 16 };
    const local = barrelPoint(fire, mount);
    assert.deepEqual(local, { x: 28, y: 8 });
    assert.deepEqual(barrelPoint(mount, mount), { x: 0, y: 0 });
    const scale = archiveScale(TILE);
    const at = muzzlePoint(
      { x: 100, y: 200 },
      { turn: 0, flip: false },
      local,
      { x: 0, y: 0 },
      {
        x: scale,
        y: scale,
      },
    );
    assert.ok(at);
    assert.ok(Math.abs(at.x - (100 + 28 * scale)) < 1e-9);
    assert.ok(Math.abs(at.y - (200 + 8 * scale)) < 1e-9);
    const up = muzzlePoint({ x: 100, y: 200 }, { turn: -90, flip: false }, local, { x: 0, y: 0 });
    assert.ok(up);
    assert.ok(Math.abs(up.x - 108) < 1e-9);
    assert.ok(Math.abs(up.y - (200 - 28)) < 1e-9);
  });

  it("turns a tall shot clockwise so its nose follows the heading", () => {
    assert.equal(projectileHeading(0, 50, 20), 0);
    assert.equal(projectileHeading(0.4, 43, 32), 0.4);
    assert.equal(projectileHeading(0, 32, 80), Math.PI / 2);
    assert.equal(projectileHeading(-Math.PI / 2, 32, 80), 0);
  });

  it("draws a drone icon large enough for the craft in the middle of the sheet", () => {
    assert.equal(DRONE_SHEET_FIT, 2);
    assert.equal(droneIconSide(24), 48);
  });
});

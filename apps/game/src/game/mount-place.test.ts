import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hullDef, pictureForRooms, ROOM_PX } from "@stl/pack";
import { weaponPixels } from "./gear-look.ts";
import { layoutFor } from "./layouts.ts";
import "./pack/base.ts";
import {
  GUN_ART,
  GUN_PX,
  SLIDE_PX,
  gunHeight,
  mountImage,
  mountPose,
  muzzlePoint,
} from "./mount-place.ts";

describe("archive weapon hardpoints", () => {
  it("places the Kestrel nose guns on the room grid", () => {
    const hull = hullDef("PLAYER_SHIP_HARD");
    const image = hull?.picture;
    const mounts = hull?.mounts;
    assert.ok(image && mounts && mounts[0] && mounts[1]);
    assert.equal(hull?.layout, "kestral");
    assert.deepEqual(image, { x: -59, y: -103, w: 652, h: 418 });
    assert.deepEqual(mounts[0], {
      x: 540,
      y: 155,
      rotate: true,
      mirror: true,
      gib: 6,
      slide: "up",
    });
    assert.deepEqual(mounts[1], {
      x: 540,
      y: 262,
      rotate: true,
      mirror: false,
      gib: 6,
      slide: "down",
    });
    const top = mountPose(image, mounts[0], true);
    const bottom = mountPose(image, mounts[1], true);
    assert.deepEqual(top, { x: -59 + 540, y: -103 + 155, turn: 0, flip: true });
    assert.deepEqual(bottom, { x: -59 + 540, y: -103 + 262, turn: 0, flip: false });
    const rooms = layoutFor("PLAYER_SHIP_HARD")?.rooms;
    assert.ok(rooms);
    const wide = 15 * ROOM_PX;
    const tall = 6 * ROOM_PX;
    assert.ok(top.x > 0 && top.x < wide && top.y > 0 && top.y < tall);
    assert.ok(bottom.x > 0 && bottom.x < wide);
    assert.ok(bottom.y < tall);
    assert.ok(top.y < bottom.y);
  });

  it("returns the measured picture, and the room box stays the bitmap grid", () => {
    const rooms = layoutFor("PLAYER_SHIP_HARD")?.rooms;
    assert.ok(rooms);
    const placeholder = pictureForRooms(rooms);
    const loaded = hullDef("PLAYER_SHIP_HARD")?.picture;
    const bottom = hullDef("PLAYER_SHIP_HARD")?.mounts?.[1];
    assert.ok(placeholder && loaded && bottom);
    assert.deepEqual(loaded, { x: -59, y: -103, w: 652, h: 418 });
    assert.notDeepEqual(loaded, placeholder);
    assert.deepEqual(mountImage("kestral", loaded, rooms), loaded);
    const tucked = mountPose(placeholder, bottom, true);
    assert.ok(tucked.y > 6 * ROOM_PX);
  });

  it("slides an unpowered gun back, and leaves a missing slide alone", () => {
    const image = { x: 0, y: 0, w: 10, h: 10 };
    const up = { x: 40, y: 50, rotate: true, mirror: true, gib: 1, slide: "up" as const };
    assert.equal(mountPose(image, up, false).y, 50 + SLIDE_PX);
    assert.equal(mountPose(image, up, true).y, 50);
    const still = { x: 40, y: 50, rotate: false, mirror: false, gib: 1 };
    assert.deepEqual(mountPose(image, still, false), { x: 40, y: 50, turn: -90, flip: false });
    const fixed = { ...still, slide: "no" as const };
    assert.equal(mountPose(image, fixed, false).y, 50);
  });

  it("starts a drawn shot at the hardpoint plus the fire point", () => {
    const hard = { x: 100, y: 200 };
    const mount = { x: 2, y: 4 };
    const pose = { turn: 0, flip: false };
    assert.equal(muzzlePoint(hard, pose, undefined, mount), undefined);
    // The stand-in fire point sits on the mount point, so the shot leaves the hardpoint.
    assert.deepEqual(muzzlePoint(hard, pose, { x: 2, y: 4 }, mount), hard);
    assert.deepEqual(muzzlePoint(hard, pose, { x: 12, y: 7 }, mount), { x: 110, y: 203 });
    assert.deepEqual(muzzlePoint(hard, { turn: 0, flip: true }, { x: 12, y: 7 }, mount), {
      x: 110,
      y: 197,
    });
    const up = muzzlePoint(hard, { turn: -90, flip: false }, { x: 12, y: 4 }, mount);
    assert.ok(up);
    assert.ok(Math.abs(up.x - 100) < 1e-9);
    assert.ok(Math.abs(up.y - 190) < 1e-9);
    const flippedUp = muzzlePoint(hard, { turn: -90, flip: true }, { x: 2, y: 8 }, mount);
    assert.ok(flippedUp);
    assert.ok(Math.abs(flippedUp.x - 96) < 1e-9);
    assert.ok(Math.abs(flippedUp.y - 200) < 1e-9);
    assert.deepEqual(muzzlePoint(hard, pose, { x: 12, y: 7 }, mount, { x: 2, y: 3 }), {
      x: 120,
      y: 209,
    });
  });

  it("sizes the procedural barrel from the grid pitch", () => {
    const art = weaponPixels("LASER_BURST_3");
    assert.equal(art.w, GUN_ART.w);
    assert.equal(art.h, GUN_ART.h);
    assert.equal(gunHeight(ROOM_PX), (GUN_ART.h / GUN_ART.w) * GUN_PX);
  });
});

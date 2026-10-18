import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOUNT_IMAGES, WEAPON_MOUNTS } from "@stl/catalog/src/weapon-mounts.ts";
import { SHIP_LAYOUTS } from "@stl/catalog/src/ship-layouts.ts";
import { pictureForRooms, ROOM_PX } from "@stl/pack";
import { weaponPixels } from "./gear-look.ts";
import { GUN_ART, GUN_PX, SLIDE_PX, gunHeight, mountImage, mountPose } from "./mount-place.ts";

describe("archive weapon hardpoints", () => {
  it("keeps an image box for every mount list", () => {
    assert.deepEqual(Object.keys(MOUNT_IMAGES).sort(), Object.keys(WEAPON_MOUNTS).sort());
  });

  it("places the Kestrel nose guns on the room grid", () => {
    const image = MOUNT_IMAGES.kestral!;
    const mounts = WEAPON_MOUNTS.kestral!;
    const top = mountPose(image, mounts[0]!, true);
    const bottom = mountPose(image, mounts[1]!, true);
    assert.deepEqual(top, { x: -59 + 540, y: -103 + 155, turn: 0, flip: true });
    assert.deepEqual(bottom, { x: -59 + 540, y: -103 + 262, turn: 0, flip: false });
    const rooms = SHIP_LAYOUTS.PLAYER_SHIP_HARD!.rooms;
    const wide = 15 * ROOM_PX;
    const tall = 6 * ROOM_PX;
    assert.ok(top.x > 0 && top.x < wide && top.y > 0 && top.y < tall);
    assert.ok(bottom.x > 0 && bottom.x < wide && bottom.y > 0 && bottom.y < tall);
    assert.ok(top.y < bottom.y);
  });

  it("uses the archive image when the hull picture is the room box", () => {
    const rooms = SHIP_LAYOUTS.PLAYER_SHIP_HARD!.rooms;
    const placeholder = pictureForRooms(rooms);
    assert.deepEqual(mountImage("kestral", placeholder, rooms), MOUNT_IMAGES.kestral);
    const loaded = { x: -59, y: -103, w: 652, h: 418 };
    assert.deepEqual(mountImage("kestral", loaded, rooms), loaded);
    const tucked = mountPose(placeholder!, WEAPON_MOUNTS.kestral![1]!, true);
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

  it("sizes the procedural barrel from the grid pitch", () => {
    const art = weaponPixels("LASER_BURST_3");
    assert.equal(art.w, GUN_ART.w);
    assert.equal(art.h, GUN_ART.h);
    assert.equal(gunHeight(ROOM_PX), (GUN_ART.h / GUN_ART.w) * GUN_PX);
  });
});

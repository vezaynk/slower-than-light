import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOUNT_IMAGES, WEAPON_MOUNTS } from "../weapon-mounts.ts";

describe("weapon mounts", () => {
  it("keeps an image box for every mount list", () => {
    assert.deepEqual(Object.keys(MOUNT_IMAGES).sort(), Object.keys(WEAPON_MOUNTS).sort());
  });
});

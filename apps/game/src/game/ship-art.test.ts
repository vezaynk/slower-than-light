import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { hullDef } from "@stl/pack";
import "./pack/base.ts";
import {
  baseImage,
  gibImage,
  rememberShipArt,
  shipArtGeneration,
  shipImage,
} from "./pack/ship-art.ts";

const created: string[] = [];
const revoked: string[] = [];

describe("ship art", () => {
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;

  afterEach(() => {
    rememberShipArt(new Map());
    created.length = 0;
    revoked.length = 0;
    if (create) URL.createObjectURL = create;
    else delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    if (revoke) URL.revokeObjectURL = revoke;
    else delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  });

  it("keeps the ship image family, and drops it when the archive is replaced", () => {
    URL.createObjectURL = () => {
      const url = `blob:ship-${created.length}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
    };
    const before = shipArtGeneration();
    assert.equal(baseImage("PLAYER_SHIP_HARD"), undefined);
    rememberShipArt(
      new Map([
        ["img/ship/kestral_cloak.png", new Blob([Uint8Array.of(1)], { type: "image/png" })],
        ["img/ship/interior/room_pilot.png", new Blob([Uint8Array.of(2)])],
        ["img/ship/kestral_base.png", new Blob([Uint8Array.of(3)], { type: "image/png" })],
        ["img/ship/kestral_floor.png", new Blob([Uint8Array.of(4)], { type: "image/png" })],
        ["img/ship/kestral_shields1.png", new Blob([Uint8Array.of(5)], { type: "image/png" })],
        ["img/ship/kestral_gib5.png", new Blob([Uint8Array.of(6)], { type: "image/png" })],
      ]),
    );
    const art = baseImage("PLAYER_SHIP_HARD");
    assert.equal(art?.url, "blob:ship-1");
    assert.equal(shipImage("PLAYER_SHIP_HARD", "cloak")?.url, "blob:ship-0");
    assert.equal(shipImage("PLAYER_SHIP_HARD", "floor")?.url, "blob:ship-2");
    assert.equal(shipImage("PLAYER_SHIP_HARD", "shield")?.url, "blob:ship-3");
    const gibId = hullDef("PLAYER_SHIP_HARD")?.gibs?.[0]?.id;
    assert.equal(gibId, 5);
    assert.equal(gibImage("PLAYER_SHIP_HARD", 5)?.url, "blob:ship-4");
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.img, "kestral");
    assert.ok(art?.picture);
    assert.equal(shipArtGeneration(), before + 1);
    rememberShipArt(new Map());
    assert.deepEqual(revoked, [
      "blob:ship-0",
      "blob:ship-1",
      "blob:ship-2",
      "blob:ship-3",
      "blob:ship-4",
    ]);
    assert.equal(baseImage("PLAYER_SHIP_HARD"), undefined);
  });
});

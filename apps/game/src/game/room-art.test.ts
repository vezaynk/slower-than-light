import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { glowFrames, roomInterior, roomPlateStem, type RoomArtHull } from "./room-art.ts";

const hull: RoomArtHull = {
  grid: {
    rooms: [
      { id: 0, x: 0, y: 0, w: 1, h: 2 },
      { id: 1, x: 2, y: 0, w: 2, h: 2 },
      { id: 2, x: 5, y: 0, w: 2, h: 1 },
    ],
  },
  installs: [
    { id: "pilot", room: 0, img: "room_pilot" },
    { id: "medbay", room: 1, img: "room_medbay" },
    { id: "clonebay", room: 1 },
    { id: "artillery", room: 2 },
  ],
};

describe("room plates", () => {
  it("uses the install image for the system that is in the room", () => {
    assert.equal(
      roomPlateStem(hull, { x: 0, y: 0, w: 1, h: 2, system: "pilot", kit: null }),
      "room_pilot",
    );
    assert.equal(
      roomPlateStem(hull, { x: 2, y: 0, w: 2, h: 2, system: "medbay", kit: null }),
      "room_medbay",
    );
  });

  it("uses room_<system> when the install does not name an image", () => {
    assert.equal(
      roomPlateStem(hull, { x: 5, y: 0, w: 2, h: 1, system: "artillery", kit: null }),
      "room_artillery",
    );
  });

  it("follows a clone bay that replaced the medbay in the same room", () => {
    assert.equal(
      roomPlateStem(hull, { x: 2, y: 0, w: 2, h: 2, system: null, kit: "clonebay" }),
      "room_clonebay",
    );
  });

  it("draws nothing in a hall", () => {
    assert.equal(
      roomPlateStem(hull, { x: 8, y: 0, w: 1, h: 1, system: null, kit: null }),
      undefined,
    );
    assert.equal(roomInterior(undefined, { x: 0, y: 0, w: 1, h: 1, system: null }), undefined);
  });

  it("names the interior file, and cycles a computer glow through three frames", () => {
    const art = roomInterior(hull, { x: 0, y: 0, w: 1, h: 2, system: "pilot" });
    assert.equal(art?.plate, "img/ship/interior/room_pilot.png");
    assert.deepEqual(glowFrames("glow_pilot"), [
      "img/ship/interior/glow_pilot1.png",
      "img/ship/interior/glow_pilot2.png",
      "img/ship/interior/glow_pilot3.png",
    ]);
    assert.deepEqual(glowFrames("img/ship/interior/glow1.png"), [
      "img/ship/interior/glow1.png",
      "img/ship/interior/glow2.png",
      "img/ship/interior/glow3.png",
    ]);
  });
});

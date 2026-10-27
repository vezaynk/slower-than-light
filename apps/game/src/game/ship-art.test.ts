import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  hullDef,
  loadPack,
  pictureFrame,
  resetPackForTests,
  ROOM_PX,
  type HullPicture,
} from "@stl/pack";
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

  afterEach(async () => {
    await rememberShipArt(new Map());
    created.length = 0;
    revoked.length = 0;
    if (create) URL.createObjectURL = create;
    else delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    if (revoke) URL.revokeObjectURL = revoke;
    else delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  });

  it("keeps the ship image family, and drops it when the archive is replaced", async () => {
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
    await rememberShipArt(
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
    await rememberShipArt(new Map());
    assert.deepEqual(revoked, [
      "blob:ship-0",
      "blob:ship-1",
      "blob:ship-2",
      "blob:ship-3",
      "blob:ship-4",
    ]);
    assert.equal(baseImage("PLAYER_SHIP_HARD"), undefined);
  });

  it("places floor and cloak by archive offset", async () => {
    installUrlMock();
    const standIn = hullDef("PLAYER_SHIP_HARD");
    assert.ok(standIn?.picture);
    assert.deepEqual(standIn.floorOffset, { x: 0, y: 0 });
    assert.deepEqual(standIn.cloakOffset, { x: 0, y: 0 });
    const standInGib = standIn.gibs?.find((gib) => gib.id === 5);
    assert.ok(standInGib);

    const picture: HullPicture = { x: -59, y: -103, w: 80, h: 50 };
    const layout = { x: 45, y: 93 };
    const floorOffset = { x: 12, y: -4 };
    const cloakOffset = { x: -6, y: 9 };
    const gib = {
      id: 1,
      x: 7,
      y: -3,
      velocityMin: 0.35,
      velocityMax: 0.9,
      directionMin: 150,
      directionMax: 210,
      angularMin: -12,
      angularMax: 12,
    };
    loadPack(
      {
        hulls: [
          {
            id: "OFFSET_SHIP",
            cruiser: "",
            layout: "offset_ship",
            name: "Offset",
            quote: "",
            unlock: "",
            reactor: 0,
            missiles: 0,
            parts: 0,
            weapons: [],
            augments: [],
            img: "offset_ship",
            picture,
            grid: { x: layout.x, y: layout.y, rooms: [], doors: [] },
            floorOffset,
            cloakOffset,
            gibs: [gib],
          },
        ],
      },
      "append",
    );
    try {
      await rememberShipArt(
        new Map([
          // The stand-in draws floor and cloak at the base size, which is the picture box.
          ["img/ship/kestral_base.png", png(standIn.picture.w, standIn.picture.h)],
          ["img/ship/kestral_floor.png", png(standIn.picture.w, standIn.picture.h)],
          ["img/ship/kestral_cloak.png", png(standIn.picture.w, standIn.picture.h)],
          ["img/ship/kestral_gib5.png", png(16, 16)],
          ["img/ship/offset_ship_base.png", png(picture.w, picture.h)],
          // A vanilla floor is smaller than the hull box.
          ["img/ship/offset_ship_floor.png", png(30, 20)],
          ["img/ship/offset_ship_cloak.png", png(picture.w, picture.h)],
          ["img/ship/offset_ship_gib1.png", png(16, 16)],
        ]),
      );

      const standInBase = placed(shipImage("PLAYER_SHIP_HARD", "base"));
      const standInFloor = placed(shipImage("PLAYER_SHIP_HARD", "floor"));
      const standInCloak = placed(shipImage("PLAYER_SHIP_HARD", "cloak"));
      assert.deepEqual(standInCloak, standInFloor);
      const glow = standIn.glow ?? { x: 0, y: 0 };
      assert.equal(standInBase.left, standInFloor.left + glow.x);
      assert.equal(standInBase.top, standInFloor.top + glow.y);
      assert.equal(standInBase.width, standInFloor.width);
      assert.equal(standInBase.height, standInFloor.height);
      const standInPiece = placed(gibImage("PLAYER_SHIP_HARD", 5));
      const standInLayoutX = standIn.grid?.x ?? 0;
      const standInLayoutY = standIn.grid?.y ?? 0;
      assert.equal(standInPiece.left, standIn.picture.x - standInLayoutX + standInGib.x);
      assert.equal(standInPiece.top, standIn.picture.y - standInLayoutY + standInGib.y);

      const base = shipImage("OFFSET_SHIP", "base");
      const floor = shipImage("OFFSET_SHIP", "floor");
      const cloak = shipImage("OFFSET_SHIP", "cloak");
      const piece = gibImage("OFFSET_SHIP", 1);
      assert.ok(base && floor && cloak && piece);
      // frame() returns layoutOffset - extra. pictureFrame subtracts that, so the
      // image lands at picture - layoutOffset + extra. Do not flip that sign.
      assert.equal(floor.offsetX, layout.x - floorOffset.x);
      assert.equal(floor.offsetY, layout.y - floorOffset.y);
      const baseBox = placed(base);
      const floorBox = placed(floor);
      const cloakBox = placed(cloak);
      assert.equal(baseBox.left, picture.x - layout.x);
      assert.equal(baseBox.top, picture.y - layout.y);
      assert.equal(floorBox.left, picture.x - floor.offsetX);
      assert.equal(floorBox.top, picture.y - floor.offsetY);
      assert.equal(floorBox.left, baseBox.left + floorOffset.x);
      assert.equal(floorBox.top, baseBox.top + floorOffset.y);
      // Drawn at its own size from the offset, not stretched to the hull box.
      assert.equal(floorBox.width, 30);
      assert.equal(floorBox.height, 20);
      assert.equal(cloak.offsetX, layout.x - cloakOffset.x);
      assert.equal(cloak.offsetY, layout.y - cloakOffset.y);
      assert.equal(cloakBox.left, baseBox.left + cloakOffset.x);
      assert.equal(cloakBox.top, baseBox.top + cloakOffset.y);
      assert.equal(cloakBox.width, picture.w);
      assert.equal(cloakBox.height, picture.h);
      const pieceBox = placed(piece);
      assert.equal(piece.offsetX, layout.x - gib.x);
      assert.equal(piece.offsetY, layout.y - gib.y);
      assert.equal(pieceBox.left, baseBox.left + gib.x);
      assert.equal(pieceBox.top, baseBox.top + gib.y);
      assert.equal(pieceBox.width, 16);
      assert.equal(pieceBox.height, 16);

      await rememberShipArt(
        new Map([
          ["img/ship/offset_ship_base.png", png(picture.w, picture.h)],
          ["img/ship/offset_ship_floor.png", png(30, 20)],
          ["img/ship/offset_ship_cloak.png", png(picture.w + 20, picture.h + 20)],
          ["img/ship/offset_ship_gib1.png", png(16, 16)],
        ]),
      );
      const outlined = shipImage("OFFSET_SHIP", "cloak");
      const outlinedPiece = gibImage("OFFSET_SHIP", 1);
      assert.ok(outlined && outlinedPiece);
      const outlinedBox = placed(outlined);
      assert.equal(outlinedBox.left, baseBox.left + cloakOffset.x - 10);
      assert.equal(outlinedBox.top, baseBox.top + cloakOffset.y - 10);
      assert.equal(outlinedBox.width, picture.w + 20);
      assert.equal(outlinedBox.height, picture.h + 20);
      assert.deepEqual(placed(outlinedPiece), pieceBox);

      await rememberShipArt(
        new Map([
          ["img/ship/offset_ship_base.png", png(picture.w, picture.h)],
          ["img/ship/offset_ship_cloak.png", png(picture.w + 20, picture.h)],
        ]),
      );
      // Not the outline shape: placed by its offset at its own size.
      const wideOnly = shipImage("OFFSET_SHIP", "cloak");
      assert.ok(wideOnly);
      const wideBox = placed(wideOnly);
      assert.equal(wideBox.left, baseBox.left + cloakOffset.x);
      assert.equal(wideBox.top, baseBox.top + cloakOffset.y);
      assert.equal(wideBox.width, picture.w + 20);
      assert.equal(wideBox.height, picture.h);
    } finally {
      resetPackForTests();
    }
  });

  it("reads a player plate from img/ship and an enemy plate from ships_glow", async () => {
    installUrlMock();
    const picture: HullPicture = { x: -86, y: -45, w: 346, h: 509 };
    const layout = { x: 0, y: 0 };
    const glow = { x: 28, y: 27 };
    loadPack(
      {
        hulls: [
          {
            id: "GLOW_SHIP",
            cruiser: "",
            layout: "rebel_long",
            name: "Rebel",
            quote: "",
            unlock: "",
            reactor: 0,
            missiles: 0,
            parts: 0,
            weapons: [],
            augments: [],
            img: "rebel_long",
            picture,
            grid: { x: layout.x, y: layout.y, rooms: [], doors: [] },
            glow,
            gibs: [
              {
                id: 1,
                x: 4,
                y: 5,
                velocityMin: 0.35,
                velocityMax: 0.9,
                directionMin: 0,
                directionMax: 40,
                angularMin: -12,
                angularMax: 12,
              },
            ],
          },
        ],
      },
      "append",
    );
    try {
      await rememberShipArt(
        new Map([
          ["img/ships_glow/rebel_long_base.png", png(picture.w, picture.h)],
          ["img/ships_noglow/rebel_long_base.png", png(290, 455)],
          ["img/ships_glow/rebel_long_gib1.png", png(16, 16)],
          ["img/ship/rebel_long_cloak.png", png(306, 471)],
          ["img/ship/rebel_long_base.png", png(picture.w, picture.h)],
          ["img/ship/rebel_long_gib1.png", png(16, 16)],
        ]),
      );
      const enemy = shipImage("GLOW_SHIP", "base", "glow");
      const enemyPiece = gibImage("GLOW_SHIP", 1, "glow");
      assert.equal(enemy?.url, "blob:ship-0");
      assert.equal(enemyPiece?.url, "blob:ship-1");
      const box = placed(enemy);
      // The enemy bitmap is the <img> box. glowOffset does not slide it.
      assert.equal(box.left, picture.x - layout.x);
      assert.equal(box.top, picture.y - layout.y);
      assert.equal(box.width, picture.w);
      assert.equal(box.height, picture.h);
      const pieceBox = placed(enemyPiece);
      assert.equal(pieceBox.width, 16);
      assert.equal(pieceBox.height, 16);

      const interior = shipImage("GLOW_SHIP", "base");
      const interiorPiece = gibImage("GLOW_SHIP", 1);
      assert.equal(interior?.url, "blob:ship-3");
      assert.equal(interiorPiece?.url, "blob:ship-4");
      const interiorBox = placed(interior);
      assert.equal(interiorBox.left, picture.x - layout.x + glow.x);
      assert.equal(interiorBox.top, picture.y - layout.y + glow.y);

      await rememberShipArt(new Map([["img/ship/rebel_long_base.png", png(picture.w, picture.h)]]));
      assert.equal(shipImage("GLOW_SHIP", "base", "glow"), undefined);
      assert.equal(gibImage("GLOW_SHIP", 1, "glow"), undefined);
      assert.ok(shipImage("GLOW_SHIP", "base"));

      await rememberShipArt(
        new Map([["img/ships_glow/rebel_long_base.png", png(picture.w, picture.h)]]),
      );
      assert.equal(shipImage("GLOW_SHIP", "base"), undefined);
      assert.ok(shipImage("GLOW_SHIP", "base", "glow"));
    } finally {
      resetPackForTests();
    }
  });
});

function installUrlMock(): void {
  URL.createObjectURL = () => {
    const url = `blob:ship-${created.length}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
  };
}

/** Archive pixels. pictureFrame subtracts the offset frame() stored. */
function placed(frame: { picture: HullPicture; offsetX: number; offsetY: number } | undefined) {
  assert.ok(frame);
  return pictureFrame(frame.picture, { x: frame.offsetX, y: frame.offsetY }, ROOM_PX);
}

/** A PNG header with the given pixel size. The IDAT is not required to read the size. */
function png(width: number, height: number): Blob {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Blob([bytes], { type: "image/png" });
}

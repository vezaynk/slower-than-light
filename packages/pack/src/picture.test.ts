import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { emitFtlShips } from "./ftl-emit.ts";
import { packFromFtl } from "./ftl.ts";
import { attachPictures, pictureForRooms, pictureFrame, pictureXml, ROOM_PX } from "./picture.ts";
import { hullDef, loadPack, resetPackForTests } from "./registry.ts";
import type { HullDef, HullMount } from "./types.ts";

/** Ships are ftl.dat blueprints, read by packFromFtl. */
function ships(xml: string) {
  return packFromFtl([{ path: "data/blueprints.xml", xml }]).hulls;
}

afterEach(() => {
  resetPackForTests();
});

const HULL = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <shipBlueprint name="PLAYER_SHIP_HARD" layout="kestral" img="kestral">
    <title>The Kestrel</title>
  </shipBlueprint>
</FTL>
`;

describe("hull pictures", () => {
  it("places the placeholder one cell outside the rooms", () => {
    const picture = pictureForRooms([
      { x: 0, y: 0, w: 2, h: 1 },
      { x: 2, y: 0, w: 1, h: 2 },
    ]);
    assert.deepEqual(picture, { x: -ROOM_PX, y: -ROOM_PX, w: 5 * ROOM_PX, h: 4 * ROOM_PX });
    const frame = pictureFrame(picture!, {}, ROOM_PX);
    assert.equal(frame.left, -ROOM_PX);
    assert.equal(frame.top, -ROOM_PX);
    assert.equal(frame.width, 5 * ROOM_PX);
    assert.equal(frame.height, 4 * ROOM_PX);
  });

  it("skips an empty room list and a zero-size room", () => {
    assert.equal(pictureForRooms([]), undefined);
    assert.equal(pictureForRooms([{ x: 1, y: 1, w: 0, h: 2 }]), undefined);
  });

  it("shifts the frame by the layout offset", () => {
    const frame = pictureFrame({ x: -59, y: -103, w: 652, h: 418 }, { x: 45, y: 93 }, 35);
    assert.equal(frame.left, -104);
    assert.equal(frame.top, -196);
    assert.equal(frame.width, 652);
    assert.equal(frame.height, 418);
  });

  it("reads the img attribute and writes it back", () => {
    const parsed = ships(HULL);
    assert.equal(parsed?.[0]?.img, "kestral");
    assert.equal(parsed?.[0]?.picture, undefined);
    const xml = emitFtlShips(parsed ?? []);
    assert.match(xml, /img="kestral"/);
    assert.equal(ships(xml)?.[0]?.img, "kestral");
  });

  it("leaves a hull with no image name unmarked", () => {
    const bare = HULL.replace(' img="kestral"', "");
    const xml = emitFtlShips(ships(bare) ?? []);
    assert.equal(xml.includes("img="), false);
  });

  it("attaches the drawing file, and a later file with the same stem wins", () => {
    const pack = packFromFtl([
      { path: "data/blueprints.xml", xml: HULL },
      { path: "data/kestral.xml", xml: pictureXml({ x: -59, y: -103, w: 652, h: 418 }) },
      { path: "extra/kestral.xml", xml: pictureXml({ x: -10, y: -20, w: 70, h: 35 }) },
      {
        path: "data/boss.xml",
        xml: `<?xml version="1.0" encoding="UTF-8"?>\n<FTL><weaponMounts/></FTL>\n`,
      },
    ]);
    assert.deepEqual(pack.hulls?.[0]?.picture, { x: -10, y: -20, w: 70, h: 35 });
  });

  it("reads weapon mounts, and a later picture leaves a mount list in place", () => {
    const mounts: HullMount[] = [
      { x: 268, y: 32, rotate: true, mirror: true, gib: 2, slide: "up" },
      { x: 134, y: 132, rotate: false, mirror: true, gib: 3 },
    ];
    const hull = bareHull("fed_cruiser");
    attachPictures(
      [hull],
      [
        { path: "data/fed_cruiser.xml", xml: pictureXml({ x: 1, y: 2, w: 30, h: 40 }, mounts) },
        { path: "extra/fed_cruiser.xml", xml: pictureXml({ x: 4, y: 5, w: 6, h: 7 }) },
      ],
    );
    assert.deepEqual(hull.picture, { x: 4, y: 5, w: 6, h: 7 });
    assert.deepEqual(hull.mounts, mounts);
    assert.equal(xmlHasSlide(pictureXml({ x: 1, y: 2, w: 3, h: 4 }, [mounts[1]!])), false);
  });

  it("reads cloak, floor, glow, and gibs, and a later picture keeps them", () => {
    const sheet = {
      glow: { x: 1, y: -2 },
      cloakOffset: { x: 3, y: 4 },
      floorOffset: { x: -5, y: 6 },
      gibs: [
        {
          id: 1,
          x: 10,
          y: 20,
          velocityMin: 0.35,
          velocityMax: 0.9,
          directionMin: 150,
          directionMax: 210,
          angularMin: -12,
          angularMax: 12,
        },
      ],
    };
    const hull = bareHull("kestral");
    const xml = pictureXml({ x: 1, y: 2, w: 30, h: 40 }, undefined, sheet);
    assert.match(xml, /<glowOffset x="1" y="-2"\/>/);
    assert.match(xml, /<offsets><cloak x="3" y="4"\/><floor x="-5" y="6"\/><\/offsets>/);
    assert.match(xml, /<gib1><x>10<\/x><y>20<\/y>/);
    attachPictures(
      [hull],
      [
        { path: "data/kestral.xml", xml },
        { path: "extra/kestral.xml", xml: pictureXml({ x: 8, y: 9, w: 10, h: 11 }) },
      ],
    );
    assert.deepEqual(hull.picture, { x: 8, y: 9, w: 10, h: 11 });
    assert.deepEqual(hull.glow, sheet.glow);
    assert.deepEqual(hull.cloakOffset, sheet.cloakOffset);
    assert.deepEqual(hull.floorOffset, sheet.floorOffset);
    assert.deepEqual(hull.gibs, sheet.gibs);
  });

  it("copies the picture when the pack is installed", () => {
    const hull = ships(HULL)?.[0];
    assert.ok(hull);
    hull.picture = { x: 1, y: 2, w: 3, h: 4 };
    hull.mounts = [{ x: 7, y: 8, rotate: false, mirror: true, gib: 2, slide: "down" }];
    loadPack({ hulls: [hull] }, "base");
    hull.picture.x = 9;
    hull.mounts[0]!.x = 9;
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.picture?.x, 1);
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.mounts?.[0]?.x, 7);
    const again = hullDef("PLAYER_SHIP_HARD");
    assert.ok(again);
    const stamped: HullDef = { ...again, picture: { ...again.picture!, x: 8 } };
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.picture?.x, 1);
    assert.equal(stamped.picture?.x, 8);
  });
});

function xmlHasSlide(xml: string): boolean {
  return xml.includes("slide=");
}

function bareHull(layout: string): HullDef {
  return {
    id: layout,
    cruiser: "",
    layout,
    name: layout,
    quote: "",
    unlock: "",
    reactor: 0,
    missiles: 0,
    parts: 0,
    weapons: [],
    augments: [],
  };
}

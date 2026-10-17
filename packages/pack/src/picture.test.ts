import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { emitPack } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import { pictureForRooms, pictureFrame, pictureXml, ROOM_PX } from "./picture.ts";
import { hullDef, loadPack, resetPackForTests } from "./registry.ts";
import type { HullDef } from "./types.ts";

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
    const parsed = parsePack(HULL);
    assert.equal(parsed.hulls?.[0]?.img, "kestral");
    assert.equal(parsed.hulls?.[0]?.picture, undefined);
    const xml = emitPack({ hulls: parsed.hulls });
    assert.match(xml, /img="kestral"/);
    assert.equal(parsePack(xml).hulls?.[0]?.img, "kestral");
  });

  it("leaves a hull with no image name unmarked", () => {
    const bare = HULL.replace(' img="kestral"', "");
    const xml = emitPack({ hulls: parsePack(bare).hulls });
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

  it("copies the picture when the pack is installed", () => {
    const hull = parsePack(HULL).hulls?.[0];
    assert.ok(hull);
    hull.picture = { x: 1, y: 2, w: 3, h: 4 };
    loadPack({ hulls: [hull] }, "base");
    hull.picture.x = 9;
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.picture?.x, 1);
    const again = hullDef("PLAYER_SHIP_HARD");
    assert.ok(again);
    const stamped: HullDef = { ...again, picture: { ...again.picture!, x: 8 } };
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.picture?.x, 1);
    assert.equal(stamped.picture?.x, 8);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePack } from "@stl/pack";
import { extractFtlDat } from "./extract.ts";

const HEADER_SIZE = 16;
const ENTRY_SIZE = 20;
const DEFLATE_FLAG = 1 << 24;

const WEAPON_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="ember">
    <type>LASER</type>
    <title>Ember</title>
    <power>1</power>
    <cooldown>7</cooldown>
    <shots>2</shots>
    <damage>3</damage>
    <cost>20</cost>
    <tooltip>A short bolt.</tooltip>
  </weaponBlueprint>
</FTL>
`;

const NAMES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <nameList>
    <name>Ada</name>
  </nameList>
</FTL>
`;

type FixtureEntry = {
  path: string;
  packed: Uint8Array;
  unpacked: number;
  deflated: boolean;
};

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const stream = new Blob([copy]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function xmlEntry(path: string, xml: string, compressed: boolean): Promise<FixtureEntry> {
  const raw = new TextEncoder().encode(xml);
  const packed = compressed ? await deflate(raw) : raw;
  return { path, packed, unpacked: raw.byteLength, deflated: compressed };
}

function packDat(entries: (FixtureEntry | null)[]): Uint8Array {
  let pathsSize = 0;
  const pathOffsets = entries.map((entry) => {
    if (!entry) return 0;
    const offset = pathsSize;
    pathsSize += entry.path.length + 1;
    return offset;
  });
  const dataStart = HEADER_SIZE + entries.length * ENTRY_SIZE + pathsSize;
  let cursor = dataStart;
  const placed = entries.map((entry) => {
    if (!entry) return { offset: 0, size: 0 };
    const offset = cursor;
    cursor += entry.packed.byteLength;
    return { offset, size: entry.packed.byteLength };
  });
  const out = new Uint8Array(cursor);
  const view = new DataView(out.buffer);
  out.set(SIGNATURE_BYTES, 0);
  view.setUint16(4, HEADER_SIZE, false);
  view.setUint16(6, ENTRY_SIZE, false);
  view.setUint32(8, entries.length, false);
  view.setUint32(12, pathsSize, false);
  let pathCursor = HEADER_SIZE + entries.length * ENTRY_SIZE;
  entries.forEach((entry, index) => {
    const at = HEADER_SIZE + index * ENTRY_SIZE;
    const place = placed[index] ?? { offset: 0, size: 0 };
    const flags = (pathOffsets[index] ?? 0) | (entry?.deflated ? DEFLATE_FLAG : 0);
    view.setUint32(at + 4, flags, false);
    view.setUint32(at + 8, place.offset, false);
    view.setUint32(at + 12, place.size, false);
    view.setUint32(at + 16, entry?.unpacked ?? 0, false);
    if (!entry) return;
    for (let i = 0; i < entry.path.length; i++) out[pathCursor + i] = entry.path.charCodeAt(i);
    pathCursor += entry.path.length + 1;
  });
  entries.forEach((entry, index) => {
    if (!entry) return;
    out.set(entry.packed, placed[index]?.offset ?? 0);
  });
  return out;
}

const SIGNATURE_BYTES = Uint8Array.of(0x50, 0x4b, 0x47, 0x0a);

describe("extractFtlDat", () => {
  it("returns pack XML and asset blobs from a PKG archive", async () => {
    const png = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 1, 2, 3);
    const dat = packDat([
      await xmlEntry("data/blueprints.xml", WEAPON_XML, true),
      null,
      await xmlEntry("data/names.xml", NAMES_XML, false),
      {
        path: "data/kestral.txt",
        packed: new TextEncoder().encode("ROOM\n0\n"),
        unpacked: new TextEncoder().encode("ROOM\n0\n").byteLength,
        deflated: false,
      },
      {
        path: "img/ship/ember.png",
        packed: await deflate(png),
        unpacked: png.byteLength,
        deflated: true,
      },
    ]);

    const padded = new Uint8Array(dat.byteLength + 8);
    padded.set(dat, 4);
    const extracted = await extractFtlDat(new Blob([padded.subarray(4)]));

    assert.deepEqual(
      extracted.documents.map((document) => document.path),
      ["data/blueprints.xml", "data/names.xml"],
    );
    assert.equal(extracted.documents[0]?.xml, WEAPON_XML);
    assert.equal(extracted.documents[1]?.xml, NAMES_XML);
    assert.equal(extracted.text.get("data/kestral.txt"), "ROOM\n0\n");
    assert.equal(extracted.assets.get("img/ship/ember.png")?.type, "image/png");
    assert.deepEqual(
      new Uint8Array(await extracted.assets.get("img/ship/ember.png")!.arrayBuffer()),
      png,
    );

    const weapon = parsePack(extracted.documents[0]!.xml).weapons?.[0];
    assert.ok(weapon);
    assert.equal(weapon.id, "ember");
    assert.equal(weapon.name, "Ember");
    assert.equal(weapon.kind, "laser");
    assert.equal(weapon.power, 1);
    assert.equal(weapon.charge, 7);
    assert.equal(weapon.shots, 2);
    assert.equal(weapon.damage, 3);
    assert.equal(weapon.price, 20);
    assert.equal(weapon.blurb, "A short bolt.");
  });

  it("rejects a file that is not a PKG archive", async () => {
    await assert.rejects(extractFtlDat(Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16)), /not a PKG archive/);
  });

  it("rejects an entry whose inflated size does not match", async () => {
    const entry = await xmlEntry("data/blueprints.xml", WEAPON_XML, true);
    entry.unpacked = 4;
    await assert.rejects(extractFtlDat(packDat([entry])), /expected 4/);
  });
});

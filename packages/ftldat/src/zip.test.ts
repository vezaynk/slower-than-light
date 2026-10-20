import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { zipSync } from "fflate";
import { packFtlDat } from "./extract.ts";
import { extractArchive, extractFtlZip, packFtlZip } from "./zip.ts";

const encoder = new TextEncoder();

const APPEND = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>Ember</title>
  </weaponBlueprint>
</FTL>
`;

const EXTRA = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="SPARK">
    <type>LASER</type>
    <title>Spark</title>
  </weaponBlueprint>
</FTL>
`;

const LAYOUT = `X_OFFSET
0
Y_OFFSET
0
VERTICAL
0
ELLIPSE
1
1
0
0
ROOM
0
1
2
3
4
`;

function zip(entries: Record<string, string | Uint8Array>): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const [path, value] of Object.entries(entries)) {
    files[path] = typeof value === "string" ? encoder.encode(value) : value;
  }
  return zipSync(files);
}

describe("extractFtlZip", () => {
  it("returns the same path map as a dat, in zip order", async () => {
    const extracted = await extractFtlZip(
      zip({
        "data/a.xml": EXTRA,
        "data/blueprints.xml.append": APPEND,
        "data/kestral.txt": LAYOUT,
        "img/ship/dot.png": Uint8Array.of(1, 2, 3, 4),
        "mod-appendix/metadata.xml": "<mod></mod>",
      }),
    );
    assert.deepEqual(
      extracted.documents.map((doc) => doc.path),
      ["data/a.xml", "data/blueprints.xml.append"],
    );
    assert.equal(extracted.documents[1]?.xml.includes("EMBER"), true);
    assert.equal(extracted.text.get("data/kestral.txt"), LAYOUT);
    const image = extracted.assets.get("img/ship/dot.png");
    assert.equal(image?.type, "image/png");
    assert.equal(image?.size, 4);
    const paths = [
      ...extracted.documents.map((doc) => doc.path),
      ...extracted.text.keys(),
      ...extracted.assets.keys(),
    ];
    assert.equal(
      paths.some((path) => path.includes("mod-appendix")),
      false,
    );
  });

  it("strips one wrapper folder and ignores archive junk", async () => {
    const extracted = await extractFtlZip(
      zip({
        "Example Mod/data/blueprints.xml.append": APPEND,
        "Example Mod/mod-appendix/metadata.xml": "<mod></mod>",
        "Example Mod/__MACOSX/data/._blueprints.xml.append": "junk",
        "Example Mod/.DS_Store": "junk",
      }),
    );
    assert.deepEqual(
      extracted.documents.map((doc) => doc.path),
      ["data/blueprints.xml.append"],
    );
    assert.equal(extracted.assets.size, 0);
  });

  it("reads an empty zip", async () => {
    const extracted = await extractFtlZip(zip({}));
    assert.equal(extracted.documents.length, 0);
    assert.equal(extracted.text.size, 0);
    assert.equal(extracted.assets.size, 0);
  });

  it("rejects a file that is not a zip", async () => {
    await assert.rejects(() => extractFtlZip(Uint8Array.of(1, 2, 3)), /Mod zip is not readable/);
  });

  it("keeps a larger first entry ahead of a later small one", async () => {
    const large = `<FTL>${"<weaponBlueprint name='A'/>".repeat(4000)}</FTL>`;
    const small = `<FTL><weaponBlueprint name="B"/></FTL>`;
    const extracted = await extractFtlZip(
      zip({
        "data/blueprints.xml": large,
        "data/dlcBlueprintsOverwrite.xml": small,
      }),
    );
    assert.deepEqual(
      extracted.documents.map((doc) => doc.path),
      ["data/blueprints.xml", "data/dlcBlueprintsOverwrite.xml"],
    );
    assert.equal(extracted.documents[0]?.xml.length > extracted.documents[1]!.xml.length, true);
  });

  it("keeps a raw append as a document", async () => {
    const extracted = await extractFtlZip(
      zip({
        "data/misc.xml.rawappend": "<b/>",
        "data/misc.rawclobber.xml": "<c/>",
      }),
    );
    assert.deepEqual(
      extracted.documents.map((doc) => doc.path),
      ["data/misc.xml.rawappend", "data/misc.rawclobber.xml"],
    );
    assert.equal(extracted.assets.size, 0);
  });

  it("rejects a zip with more entries than the format can count", () => {
    const files = Array.from({ length: 65536 }, () => ({
      path: "data/a.xml",
      bytes: new Uint8Array(),
    }));
    assert.throws(() => packFtlZip(files), /too many entries: 65536/);
  });

  it("packs a zip with a fixed timestamp and reads a dat or a zip by its signature", async () => {
    const files = [
      { path: "data/a.xml", bytes: encoder.encode(EXTRA) },
      { path: "data/b.xml", bytes: encoder.encode(APPEND) },
    ];
    const packed = packFtlZip(files);
    assert.equal(Buffer.compare(packed, packFtlZip(files)), 0);
    const extracted = await extractFtlZip(packed);
    assert.deepEqual(
      extracted.documents.map((doc) => doc.path),
      ["data/a.xml", "data/b.xml"],
    );
    const dat = packFtlDat([{ path: "data/a.xml", xml: EXTRA }]);
    const fromDat = await extractArchive(dat);
    const fromZip = await extractArchive(packed);
    assert.equal(fromDat.documents[0]?.xml, EXTRA);
    assert.equal(fromZip.documents[0]?.path, "data/a.xml");
  });
});

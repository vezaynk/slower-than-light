import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { zipSync } from "fflate";
import { extractFtlZip } from "./zip.ts";

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
  return zipSync(files, { level: 0 });
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

  it("rejects a file that is not a zip", async () => {
    await assert.rejects(() => extractFtlZip(Uint8Array.of(1, 2, 3)), /Mod zip is not readable/);
  });
});

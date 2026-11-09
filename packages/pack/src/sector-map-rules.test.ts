import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import { loadPack, resetPackForTests, sectorMap, sectorMapRules } from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <sectorMap cols="6" rows="4" cell="110" margin="28" empty="0.2" yMax="415" topRightY="30" link="165" dangerRadius="767" startX="-959" step="64" dangerYMin="50" dangerYMax="300" exitColMin="4" exitColMax="5" exitMinJumps="5" tries="16" fedColMin="2" fedColMax="3" fedHardColMin="3" fedHardColMax="4" fedJumps="4" fedHardJumpsMin="5" fedHardJumpsMax="6" flagshipJumpsMin="3" flagshipJumpsMax="5"/>
</FTL>`;

const LOADED = {
  cols: 6,
  rows: 4,
  cell: 110,
  margin: 28,
  empty: 0.2,
  yMax: 415,
  topRightY: 30,
  link: 165,
  dangerRadius: 767,
  startX: -959,
  step: 64,
  dangerYMin: 50,
  dangerYMax: 300,
  exitColMin: 4,
  exitColMax: 5,
  exitMinJumps: 5,
  tries: 16,
  fedColMin: 2,
  fedColMax: 3,
  fedHardColMin: 3,
  fedHardColMax: 4,
  fedJumps: 4,
  fedHardJumpsMin: 5,
  fedHardJumpsMax: 6,
  flagshipJumpsMin: 3,
  flagshipJumpsMax: 5,
};

function warned(run: () => void): string[] {
  const lines: string[] = [];
  const restore = onPackWarning((message) => lines.push(message));
  try {
    run();
  } finally {
    restore();
  }
  return lines;
}

describe("gap sector map", () => {
  it("reads the map and the fleet circle", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.sectorMap, LOADED);
    assert.deepEqual(parsePack(GAP).sectorMap, pack.sectorMap);
  });

  it("writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.sectorMap, pack.sectorMap);
  });

  it("lets a mod override the margin and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([
        { path: "data/gap.xml", xml: `<FTL><sectorMap margin="40" link="200"/></FTL>` },
      ]),
      "append",
    );
    assert.equal(sectorMap("margin"), 40);
    assert.equal(sectorMap("link"), 200);
    assert.equal(sectorMap("cell"), 110);
    assert.equal(sectorMap("startX"), -959);
    assert.equal(sectorMapRules().empty, 0.2);
    resetPackForTests();
    assert.equal(sectorMap("margin"), 28);
    assert.equal(sectorMap("link"), 165);
  });

  it("falls back to FTL's numbers, including a 10px margin, when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(sectorMap("cols"), 6);
      assert.equal(sectorMap("rows"), 4);
      assert.equal(sectorMap("cell"), 110);
      assert.equal(sectorMap("margin"), 10);
      assert.equal(sectorMap("empty"), 0.2);
      assert.equal(sectorMap("yMax"), 415);
      assert.equal(sectorMap("topRightY"), 30);
      assert.equal(sectorMap("link"), 165);
      assert.equal(sectorMap("dangerRadius"), 767);
      assert.equal(sectorMap("startX"), -959);
      assert.equal(sectorMap("step"), 64);
      assert.equal(sectorMap("dangerYMin"), 50);
      assert.equal(sectorMap("dangerYMax"), 300);
      assert.equal(sectorMap("exitColMin"), 4);
      assert.equal(sectorMap("exitColMax"), 5);
      assert.equal(sectorMap("exitMinJumps"), 5);
      assert.equal(sectorMap("tries"), 16);
      assert.equal(sectorMap("fedColMin"), 2);
      assert.equal(sectorMap("fedColMax"), 3);
      assert.equal(sectorMap("fedHardColMin"), 3);
      assert.equal(sectorMap("fedHardColMax"), 4);
      assert.equal(sectorMap("fedJumps"), 4);
      assert.equal(sectorMap("fedHardJumpsMin"), 5);
      assert.equal(sectorMap("fedHardJumpsMax"), 6);
      assert.equal(sectorMap("flagshipJumpsMin"), 3);
      assert.equal(sectorMap("flagshipJumpsMax"), 5);
    });
    assert.equal(lines.length, 26);
    assert.ok(lines.some((line) => line.includes("sectorMap margin") && line.includes("10")));
    resetPackForTests();
  });

  it("warns on a malformed value and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><sectorMap cols="nope" margin="-1" empty="2" startX="nope" cell="110" link="0" tries="16.5" exitColMin="-1" fedJumps="4"/></FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.sectorMap, { cell: 110, fedJumps: 4 });
    assert.ok(lines.some((line) => line.includes('cols="nope"')));
    assert.ok(lines.some((line) => line.includes('margin="-1"')));
    assert.ok(lines.some((line) => line.includes('empty="2"')));
    assert.ok(lines.some((line) => line.includes('startX="nope"')));
    assert.ok(lines.some((line) => line.includes('link="0"')));
    assert.ok(lines.some((line) => line.includes('tries="16.5"')));
    assert.ok(lines.some((line) => line.includes('exitColMin="-1"')));
  });
});

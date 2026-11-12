import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import { loadPack, resetPackForTests, skillMult, skillSpeeds } from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <skillSpeed repair0="1" repair1="1.1" repair2="1.2" combat0="1" combat1="1.1" combat2="1.2"/>
</FTL>`;

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

describe("gap skill speed", () => {
  it("reads the multipliers", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.skillSpeed, {
      repair0: 1,
      repair1: 1.1,
      repair2: 1.2,
      combat0: 1,
      combat1: 1.1,
      combat2: 1.2,
    });
    assert.deepEqual(parsePack(GAP).skillSpeed, pack.skillSpeed);
  });

  it("writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.skillSpeed, pack.skillSpeed);
  });

  it("reads piloting, engines, shields, and weapons", () => {
    const pack = packFromFtl([
      {
        path: "data/gap.xml",
        xml: `<FTL><skillSpeed pilot0="5" pilot1="7" pilot2="10" engines0="5" engines1="7" engines2="10" shields0="1.1" shields1="1.2" shields2="1.3" weapons0="0.9" weapons1="0.85" weapons2="0.8"/></FTL>`,
      },
    ]);
    assert.deepEqual(pack.skillSpeed, {
      pilot0: 5,
      pilot1: 7,
      pilot2: 10,
      engines0: 5,
      engines1: 7,
      engines2: 10,
      shields0: 1.1,
      shields1: 1.2,
      shields2: 1.3,
      weapons0: 0.9,
      weapons1: 0.85,
      weapons2: 0.8,
    });
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.skillSpeed, pack.skillSpeed);
  });

  it("lets a mod override one rank and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><skillSpeed repair2="2"/></FTL>` }]),
      "append",
    );
    assert.equal(skillMult("repair", 2), 2);
    assert.equal(skillMult("repair", 1), 1.1);
    assert.equal(skillMult("combat", 2), 1.2);
    assert.deepEqual(skillSpeeds().repair2, 2);
    resetPackForTests();
  });

  it("falls back to FTL's multipliers with one warning each when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(skillMult("repair", 0), 1);
      assert.equal(skillMult("repair", 1), 1.1);
      assert.equal(skillMult("repair", 2), 1.2);
      assert.equal(skillMult("combat", 2), 1.2);
      assert.equal(skillMult("combat", 2), 1.2);
    });
    assert.equal(lines.length, 4);
    assert.ok(lines[0]?.includes("skillSpeed repair0"));
    resetPackForTests();
  });

  it("warns on a malformed attribute and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><skillSpeed repair1="nope" repair2="0" combat0="1"/></FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.skillSpeed, { combat0: 1 });
    assert.ok(lines.some((line) => line.includes('repair1="nope"')));
    assert.ok(lines.some((line) => line.includes('repair2="0"')));
  });
});

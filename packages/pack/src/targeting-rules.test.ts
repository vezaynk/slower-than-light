import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import { aiTarget, aiTargets, loadPack, resetPackForTests } from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <aiTarget easy="0.2" normal="0.33" hardRoom="0.5" hardAny="0.25" evasion="25" oxygen="50" artillery="4"/>
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

describe("gap enemy targeting", () => {
  it("reads the aim chances and the Hard list lines", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.aiTarget, {
      easy: 0.2,
      normal: 0.33,
      hardRoom: 0.5,
      hardAny: 0.25,
      evasion: 25,
      oxygen: 50,
      artillery: 4,
    });
    assert.deepEqual(parsePack(GAP).aiTarget, pack.aiTarget);
  });

  it("writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.aiTarget, pack.aiTarget);
  });

  it("lets a mod override one number and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><aiTarget oxygen="1000"/></FTL>`,
        },
      ]),
      "append",
    );
    assert.equal(aiTarget("oxygen"), 1000);
    assert.equal(aiTarget("easy"), 0.2);
    assert.equal(aiTarget("artillery"), 4);
    assert.equal(aiTargets().hardRoom, 0.5);
    resetPackForTests();
    assert.equal(aiTarget("oxygen"), 50);
  });

  it("falls back to FTL's numbers with a warning when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(aiTarget("easy"), 0.2);
      assert.equal(aiTarget("normal"), 0.33);
      assert.equal(aiTarget("hardRoom"), 0.5);
      assert.equal(aiTarget("hardAny"), 0.25);
      assert.equal(aiTarget("evasion"), 25);
      assert.equal(aiTarget("oxygen"), 50);
      assert.equal(aiTarget("artillery"), 4);
    });
    assert.equal(lines.length, 7);
    assert.ok(lines[0]?.includes("aiTarget easy"));
    resetPackForTests();
  });

  it("warns on a malformed chance or line and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><aiTarget easy="nope" normal="0.4" hardRoom="2" evasion="-1" oxygen="50"/></FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.aiTarget, { normal: 0.4, oxygen: 50 });
    assert.ok(lines.some((line) => line.includes('easy="nope"')));
    assert.ok(lines.some((line) => line.includes('hardRoom="2"')));
    assert.ok(lines.some((line) => line.includes('evasion="-1"')));
  });
});

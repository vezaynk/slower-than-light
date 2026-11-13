import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import { achievementRule, achievementRules, loadPack, resetPackForTests } from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <achievementRules systems="11" power="29" stealthSector="8" blueEvents="4" blueSector="5" oxygen="20" engines="8" beamSeconds="5"/>
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

describe("gap achievement rules", () => {
  it("reads the thresholds", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.achievementRules, {
      systems: 11,
      power: 29,
      stealthSector: 8,
      blueEvents: 4,
      blueSector: 5,
      oxygen: 20,
      engines: 8,
      beamSeconds: 5,
    });
    assert.deepEqual(parsePack(GAP).achievementRules, pack.achievementRules);
  });

  it("writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.achievementRules, pack.achievementRules);
  });

  it("lets a mod override one threshold and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><achievementRules oxygen="40"/></FTL>` }]),
      "append",
    );
    assert.equal(achievementRule("oxygen"), 40);
    assert.equal(achievementRule("systems"), 11);
    assert.equal(achievementRules().oxygen, 40);
    resetPackForTests();
  });

  it("falls back to FTL's thresholds with one warning each when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(achievementRule("systems"), 11);
      assert.equal(achievementRule("power"), 29);
      assert.equal(achievementRule("stealthSector"), 8);
      assert.equal(achievementRule("blueEvents"), 4);
      assert.equal(achievementRule("blueSector"), 5);
      assert.equal(achievementRule("oxygen"), 20);
      assert.equal(achievementRule("engines"), 8);
      assert.equal(achievementRule("beamSeconds"), 5);
      assert.equal(achievementRule("systems"), 11);
    });
    assert.equal(lines.length, 8);
    assert.match(lines[0] ?? "", /achievementRules systems/);
    resetPackForTests();
  });

  it("warns on a malformed attribute and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><achievementRules systems="nope" power="0" oxygen="20"/></FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.achievementRules, { oxygen: 20 });
    assert.ok(lines.some((line) => line.includes('systems="nope"')));
    assert.ok(lines.some((line) => line.includes('power="0"')));
  });
});

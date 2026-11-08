import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import { bonusItemWeight, cargoSlotCount, loadPack, resetPackForTests } from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <cargoSlots slots="4"/>
  <bonusItem weapon="1" augment="1" drone="1"/>
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

describe("gap cargo and bonus-item rules", () => {
  it("reads the cargo hold and the bonus-item weights", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.cargoSlots, { slots: 4 });
    assert.deepEqual(pack.bonusItem, { weapon: 1, augment: 1, drone: 1 });
    assert.deepEqual(parsePack(GAP).cargoSlots, pack.cargoSlots);
    assert.deepEqual(parsePack(GAP).bonusItem, pack.bonusItem);
  });

  it("writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.cargoSlots, pack.cargoSlots);
    assert.deepEqual(back.bonusItem, pack.bonusItem);
  });

  it("lets a mod override one number and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><cargoSlots slots="1"/><bonusItem weapon="0"/></FTL>`,
        },
      ]),
      "append",
    );
    assert.equal(cargoSlotCount(), 1);
    assert.equal(bonusItemWeight("weapon"), 0);
    assert.equal(bonusItemWeight("augment"), 1);
    assert.equal(bonusItemWeight("drone"), 1);
    resetPackForTests();
    assert.equal(cargoSlotCount(), 4);
    assert.equal(bonusItemWeight("weapon"), 1);
  });

  it("falls back to FTL's numbers with a warning when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(cargoSlotCount(), 4);
      assert.equal(bonusItemWeight("weapon"), 1);
      assert.equal(bonusItemWeight("augment"), 1);
      assert.equal(bonusItemWeight("drone"), 1);
      assert.equal(cargoSlotCount(), 4);
    });
    assert.equal(lines.length, 4);
    assert.ok(lines.some((line) => line.includes("cargoSlots")));
    assert.ok(lines.some((line) => line.includes("bonusItem weapon")));
    resetPackForTests();
  });

  it("warns on a malformed slot or weight and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><cargoSlots slots="1.5"/><bonusItem weapon="-1" augment="2" drone="nope"/></FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.cargoSlots, {});
    assert.deepEqual(pack?.bonusItem, { augment: 2 });
    assert.ok(lines.some((line) => line.includes('slots="1.5"')));
    assert.ok(lines.some((line) => line.includes('weapon="-1"')));
    assert.ok(lines.some((line) => line.includes('drone="nope"')));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import {
  crystalVengeanceRule,
  crystalVengeanceStat,
  ionIntruderRule,
  ionIntruderStat,
  loadPack,
  overchargerLayerSeconds,
  overchargerWaits,
  resetPackForTests,
} from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <overchargerWaits layer0="8" layer1="10" layer2="13" layer3="16" layer4="20"/>
  <ionIntruder ion="3" stun="6" pulseMin="8.2" pulseMax="10"/>
  <crystalVengeance chance="0.1" damage="1" breach="0.1" stunChance="0.2" stun="3"/>
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

describe("gap augment and drone rules", () => {
  it("reads the overcharger waits, the ion intruder pulse, and crystal vengeance", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.overchargerWaits, {
      layer0: 8,
      layer1: 10,
      layer2: 13,
      layer3: 16,
      layer4: 20,
    });
    assert.deepEqual(pack.ionIntruder, { ion: 3, stun: 6, pulseMin: 8.2, pulseMax: 10 });
    assert.deepEqual(pack.crystalVengeance, {
      chance: 0.1,
      damage: 1,
      breach: 0.1,
      stunChance: 0.2,
      stun: 3,
    });
    assert.deepEqual(parsePack(GAP).overchargerWaits, pack.overchargerWaits);
    assert.deepEqual(parsePack(GAP).ionIntruder, pack.ionIntruder);
    assert.deepEqual(parsePack(GAP).crystalVengeance, pack.crystalVengeance);
  });

  it("writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.overchargerWaits, pack.overchargerWaits);
    assert.deepEqual(back.ionIntruder, pack.ionIntruder);
    assert.deepEqual(back.crystalVengeance, pack.crystalVengeance);
  });

  it("lets a mod override one number and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><overchargerWaits layer0="4"/><ionIntruder ion="1"/><crystalVengeance chance="1" damage="5"/></FTL>`,
        },
      ]),
      "append",
    );
    assert.equal(overchargerLayerSeconds(0), 4);
    assert.equal(overchargerLayerSeconds(1), 10);
    assert.equal(overchargerLayerSeconds(5), undefined);
    assert.equal(ionIntruderStat("ion"), 1);
    assert.equal(ionIntruderStat("stun"), 6);
    assert.equal(ionIntruderStat("pulseMin"), 8.2);
    assert.equal(crystalVengeanceStat("chance"), 1);
    assert.equal(crystalVengeanceStat("damage"), 5);
    assert.equal(crystalVengeanceStat("breach"), 0.1);
    resetPackForTests();
    assert.equal(overchargerLayerSeconds(0), 8);
    assert.equal(ionIntruderStat("ion"), 3);
    assert.equal(crystalVengeanceStat("chance"), 0.1);
    assert.deepEqual(overchargerWaits(), {
      layer0: 8,
      layer1: 10,
      layer2: 13,
      layer3: 16,
      layer4: 20,
    });
    assert.deepEqual(ionIntruderRule().pulseMax, 10);
    assert.equal(crystalVengeanceRule().stun, 3);
  });

  it("falls back to FTL's numbers with a warning when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(overchargerLayerSeconds(0), 8);
      assert.equal(overchargerLayerSeconds(0), 8);
      assert.equal(overchargerLayerSeconds(4), 20);
      assert.equal(ionIntruderStat("pulseMax"), 10);
      assert.equal(crystalVengeanceStat("stunChance"), 0.2);
    });
    assert.equal(lines.length, 4);
    assert.equal(lines.filter((line) => line.includes("overchargerWaits layer0")).length, 1);
    resetPackForTests();
  });

  it("warns on a malformed attribute and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL>
            <overchargerWaits layer0="-1" layer1="9"/>
            <ionIntruder ion="0" stun="4"/>
            <crystalVengeance chance="2" damage="1" breach="0.1"/>
          </FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.overchargerWaits, { layer1: 9 });
    assert.deepEqual(pack?.ionIntruder, { stun: 4 });
    assert.deepEqual(pack?.crystalVengeance, { damage: 1, breach: 0.1 });
    assert.ok(lines.some((line) => line.includes('layer0="-1"')));
    assert.ok(lines.some((line) => line.includes('ion="0"')));
    assert.ok(lines.some((line) => line.includes('chance="2"')));
  });
});

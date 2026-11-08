import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import {
  asteroidField,
  asteroidOdds,
  asteroidTiming,
  droneOrbit,
  loadPack,
  pulsarRule,
  resetPackForTests,
} from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <asteroidField fire="0.05" breach="0.05">
    <timing bubbles="1" breakMin="5" breakMax="10" wave1Min="8" wave1Max="16" wave2Min="5" wave2Max="8" spawn1Min="1.8" spawn1Max="2.2" spawn2Min="1.4" spawn2Max="1.6"/>
    <timing bubbles="2" breakMin="5" breakMax="10" wave1Min="10" wave1Max="20" wave2Min="5" wave2Max="10" spawn1Min="1" spawn1Max="1.8" spawn2Min="0.9" spawn2Max="1.3"/>
    <timing bubbles="4" breakMin="12" breakMax="15" wave1Min="16" wave1Max="30" wave2Min="8" wave2Max="11" spawn1Min="0.72" spawn1Max="1.35" spawn2Min="0.54" spawn2Max="0.95"/>
  </asteroidField>
  <pulsar cycleMin="11" cycleMax="18" warn="5" shieldLow="3" shieldHigh="4" ionBase="1" ionPerPower="0.5"/>
  <droneOrbit minSep="90" speedScale="21.875" stopRadius="1.15" firePause="0.5" beamHold="0.5"/>
</FTL>`;

const BAND1 = {
  bubbles: 1,
  break: [5, 10],
  wave1: [8, 16],
  wave2: [5, 8],
  spawn1: [1.8, 2.2],
  spawn2: [1.4, 1.6],
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

describe("gap asteroid field", () => {
  it("reads timings and side chances, and writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.equal(pack.asteroidField?.fire, 0.05);
    assert.equal(pack.asteroidField?.breach, 0.05);
    assert.deepEqual(pack.asteroidField?.timings?.[0], BAND1);
    assert.equal(pack.asteroidField?.timings?.length, 3);
    assert.deepEqual(parsePack(GAP).asteroidField, pack.asteroidField);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.asteroidField, pack.asteroidField);
  });

  it("lets a mod override one band and one chance and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><asteroidField fire="1"><timing bubbles="1" breakMin="1" breakMax="1" wave1Min="8" wave1Max="8" wave2Min="5" wave2Max="5" spawn1Min="0.2" spawn1Max="0.2" spawn2Min="1" spawn2Max="1"/></asteroidField></FTL>`,
        },
      ]),
      "append",
    );
    assert.equal(asteroidOdds("fire"), 1);
    assert.equal(asteroidOdds("breach"), 0.05);
    assert.deepEqual(asteroidTiming(1).break, [1, 1]);
    assert.deepEqual(asteroidTiming(1).spawn1, [0.2, 0.2]);
    assert.deepEqual(asteroidTiming(2).wave1, [10, 20]);
    assert.equal(asteroidField().timings?.length, 3);
    resetPackForTests();
  });

  it("falls back to FTL's row with a warning when no pack sets it", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.deepEqual(asteroidTiming(1), BAND1);
      assert.equal(asteroidOdds("fire"), 0.05);
      assert.equal(asteroidOdds("breach"), 0.05);
      assert.deepEqual(asteroidTiming(1).spawn2, [1.4, 1.6]);
    });
    assert.equal(lines.length, 3);
    assert.ok(lines.some((line) => line.includes("1 bubbles")));
    assert.ok(lines.some((line) => line.includes("asteroidField fire")));
    resetPackForTests();
  });

  it("warns on a malformed chance or timing and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><asteroidField fire="2" breach="0.05"><timing bubbles="9" breakMin="1" breakMax="2" wave1Min="1" wave1Max="2" wave2Min="1" wave2Max="2" spawn1Min="1" spawn1Max="2" spawn2Min="1" spawn2Max="2"/><timing bubbles="2" breakMin="5" breakMax="1" wave1Min="1" wave1Max="2" wave2Min="1" wave2Max="2" spawn1Min="1" spawn1Max="2" spawn2Min="1" spawn2Max="2"/><timing bubbles="3" breakMin="12" breakMax="15" wave1Min="16" wave1Max="28" wave2Min="8" wave2Max="13" spawn1Min="0.9" spawn1Max="1.4" spawn2Min="0.9" spawn2Max="1.3"/></asteroidField></FTL>`,
        },
      ]);
    });
    assert.equal(pack?.asteroidField?.fire, undefined);
    assert.equal(pack?.asteroidField?.breach, 0.05);
    assert.deepEqual(
      pack?.asteroidField?.timings?.map((row) => row.bubbles),
      [3],
    );
    assert.ok(lines.some((line) => line.includes('fire="2"')));
    assert.ok(lines.some((line) => line.includes('bubbles="9"')));
    assert.ok(lines.some((line) => line.includes('bubbles="2"')));
  });
});

describe("gap pulsar", () => {
  it("reads the pulsar and writes it back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.pulsar, {
      cycleMin: 11,
      cycleMax: 18,
      warn: 5,
      shieldLow: 3,
      shieldHigh: 4,
      ionBase: 1,
      ionPerPower: 0.5,
    });
    assert.deepEqual(parsePack(GAP).pulsar, pack.pulsar);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.pulsar, pack.pulsar);
  });

  it("lets a mod override one number and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([
        { path: "data/gap.xml", xml: `<FTL><pulsar warn="1" shieldLow="1" shieldHigh="1"/></FTL>` },
      ]),
      "append",
    );
    assert.equal(pulsarRule("warn"), 1);
    assert.equal(pulsarRule("shieldLow"), 1);
    assert.equal(pulsarRule("cycleMin"), 11);
    assert.equal(pulsarRule("ionPerPower"), 0.5);
    resetPackForTests();
    assert.equal(pulsarRule("warn"), 5);
    assert.equal(pulsarRule("shieldLow"), 3);
  });

  it("falls back to FTL's numbers with a warning when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(pulsarRule("cycleMin"), 11);
      assert.equal(pulsarRule("cycleMax"), 18);
      assert.equal(pulsarRule("warn"), 5);
      assert.equal(pulsarRule("ionBase"), 1);
    });
    assert.equal(lines.length, 4);
    assert.ok(lines[0]?.includes("pulsar cycleMin"));
    resetPackForTests();
  });

  it("warns on a malformed attribute and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><pulsar cycleMin="20" cycleMax="10" warn="-1" ionBase="2"/></FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.pulsar, { ionBase: 2 });
    assert.ok(lines.some((line) => line.includes("cycleMax")));
    assert.ok(lines.some((line) => line.includes('warn="-1"')));
  });
});

describe("gap drone orbit", () => {
  it("reads the orbit and writes it back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.droneOrbit, {
      minSep: 90,
      speedScale: 21.875,
      stopRadius: 1.15,
      firePause: 0.5,
      beamHold: 0.5,
    });
    assert.deepEqual(parsePack(GAP).droneOrbit, pack.droneOrbit);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.droneOrbit, pack.droneOrbit);
  });

  it("lets a mod override one number and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><droneOrbit firePause="2"/></FTL>` }]),
      "append",
    );
    assert.equal(droneOrbit("firePause"), 2);
    assert.equal(droneOrbit("beamHold"), 0.5);
    assert.equal(droneOrbit("minSep"), 90);
    resetPackForTests();
    assert.equal(droneOrbit("firePause"), 0.5);
  });

  it("falls back to FTL's numbers with a warning when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(droneOrbit("minSep"), 90);
      assert.equal(droneOrbit("speedScale"), 21.875);
      assert.equal(droneOrbit("firePause"), 0.5);
      assert.equal(droneOrbit("beamHold"), 0.5);
    });
    assert.equal(lines.length, 4);
    assert.ok(lines[0]?.includes("droneOrbit minSep"));
    resetPackForTests();
  });

  it("warns on a malformed attribute and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><droneOrbit speedScale="0" firePause="-1" beamHold="1"/></FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.droneOrbit, { beamHold: 1 });
    assert.ok(lines.some((line) => line.includes('speedScale="0"')));
    assert.ok(lines.some((line) => line.includes('firePause="-1"')));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { emitFtlShips } from "./ftl-emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import { loadPack, resetPackForTests, stalemate, stalemateStat } from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <shipBlueprint name="rebel">
    <surrender chance="50" min="20" max="30"/>
  </shipBlueprint>
  <stalemate threshold="40" seconds="60" fuel="2"/>
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

describe("gap stalemate rule", () => {
  it("reads the anti-stalemate numbers", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.stalemate, { threshold: 40, seconds: 60, fuel: 2 });
    assert.deepEqual(pack.factions, [{ id: "rebel", chance: 50, min: 20, max: 30 }]);
    assert.deepEqual(parsePack(GAP).stalemate, pack.stalemate);
    assert.deepEqual(parsePack(GAP).factions, pack.factions);
  });

  it("writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.stalemate, pack.stalemate);
    assert.deepEqual(back.factions, pack.factions);
  });

  it("lets a mod override one number and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><stalemate fuel="7"/></FTL>` }]),
      "append",
    );
    assert.equal(stalemateStat("fuel"), 7);
    assert.equal(stalemateStat("threshold"), 40);
    assert.equal(stalemateStat("seconds"), 60);
    assert.deepEqual(stalemate(), { threshold: 40, seconds: 60, fuel: 7 });
    resetPackForTests();
    assert.equal(stalemateStat("fuel"), 2);
    assert.equal(stalemateStat("seconds"), 60);
  });

  it("falls back to FTL's numbers with one warning each when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(stalemateStat("threshold"), 40);
      assert.equal(stalemateStat("seconds"), 60);
      assert.equal(stalemateStat("fuel"), 2);
      assert.equal(stalemateStat("fuel"), 2);
    });
    assert.equal(lines.length, 3);
    assert.ok(lines[0]?.includes("stalemate threshold"));
    assert.ok(lines.some((line) => line.includes("stalemate fuel")));
    resetPackForTests();
  });

  it("warns on a malformed attribute and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><stalemate threshold="nope" seconds="0" fuel="2"/></FTL>`,
        },
      ]);
    });
    assert.deepEqual(pack?.stalemate, { fuel: 2 });
    assert.ok(lines.some((line) => line.includes('threshold="nope"')));
    assert.ok(lines.some((line) => line.includes('seconds="0"')));
    assert.equal(
      lines.some((line) => line.includes("fuel")),
      false,
    );
  });
});

describe("hull surrender tag", () => {
  it("reads a surrender tag on a hull and writes it back", () => {
    const xml = `<FTL>
      <shipBlueprint name="MOD_BOSS" layout="flagship-1">
        <surrender chance="40" min="30" max="40"/>
      </shipBlueprint>
    </FTL>`;
    const pack = packFromFtl([{ path: "data/blueprints.xml", xml }]);
    assert.deepEqual(pack.hulls?.[0]?.surrender, { chance: 40, min: 30, max: 40 });
    assert.equal(
      (pack.factions ?? []).some((row) => row.id === "MOD_BOSS"),
      false,
    );
    const back = packFromFtl([
      { path: "data/blueprints.xml", xml: emitFtlShips(pack.hulls ?? []) },
    ]);
    assert.deepEqual(back.hulls?.[0]?.surrender, pack.hulls?.[0]?.surrender);
  });

  it("warns and skips a hull surrender that is missing a number", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/blueprints.xml",
          xml: `<FTL><shipBlueprint name="MOD_BOSS" layout="x"><surrender chance="10" min="1"/></shipBlueprint></FTL>`,
        },
      ]);
    });
    assert.equal(pack?.hulls?.[0]?.surrender, undefined);
    assert.equal(pack?.hulls?.[0]?.id, "MOD_BOSS");
    assert.ok(lines.some((line) => line.includes("MOD_BOSS") && line.includes("<surrender>")));
  });
});

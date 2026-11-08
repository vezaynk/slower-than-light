import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { parsePack } from "./parse.ts";
import {
  allFactionEscapes,
  escapeTimer,
  factionEscape,
  factionSurrender,
  loadPack,
  resetPackForTests,
} from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <shipBlueprint name="rebel">
    <surrender chance="50" min="20" max="30"/>
    <escape chance="50" min="30" max="40"/>
  </shipBlueprint>
  <shipBlueprint name="crystal">
    <surrender chance="40" min="30" max="40"/>
  </shipBlueprint>
  <shipBlueprint name="lanius">
    <escape chance="80" min="20" max="40"/>
  </shipBlueprint>
  <escapeTimers hull="15" lastFuel="90"/>
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

describe("gap escape rules", () => {
  it("reads faction escape rows beside surrender rows, and the timers", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.escapes, [
      { id: "rebel", chance: 50, min: 30, max: 40 },
      { id: "lanius", chance: 80, min: 20, max: 40 },
    ]);
    assert.deepEqual(
      pack.factions?.map((row) => row.id),
      ["rebel", "crystal"],
    );
    assert.deepEqual(pack.escapeTimers, { hull: 15, lastFuel: 90 });
    assert.deepEqual(parsePack(GAP).escapes, pack.escapes);
    assert.deepEqual(parsePack(GAP).escapeTimers, pack.escapeTimers);
  });

  it("writes them back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.escapes, pack.escapes);
    assert.deepEqual(back.factions, pack.factions);
    assert.deepEqual(back.escapeTimers, pack.escapeTimers);
  });

  it("lets a mod override one number and keep the rest", () => {
    resetPackForTests();
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><escapeTimers hull="20"/><shipBlueprint name="mantis"><escape chance="10" min="10" max="20"/></shipBlueprint></FTL>`,
        },
      ]),
      "append",
    );
    assert.equal(escapeTimer("hull"), 20);
    assert.equal(escapeTimer("lastFuel"), 90);
    assert.deepEqual(factionEscape("mantis"), { id: "mantis", chance: 10, min: 10, max: 20 });
    assert.equal(factionEscape("rebel")?.chance, 50);
    // An escape-only row does not make the faction offer a surrender.
    assert.equal(factionSurrender("lanius"), undefined);
    assert.equal(factionEscape("engi"), undefined);
    resetPackForTests();
    assert.equal(escapeTimer("hull"), 15);
    assert.equal(factionEscape("mantis"), undefined);
    assert.equal(allFactionEscapes().length, 2);
  });

  it("falls back to FTL's timers with a warning when no pack sets them", () => {
    resetPackForTests();
    loadPack({}, "base");
    const lines = warned(() => {
      assert.equal(escapeTimer("hull"), 15);
      assert.equal(escapeTimer("lastFuel"), 90);
    });
    assert.equal(lines.length, 2);
    assert.ok(lines[0]?.includes("escapeTimers hull"));
    resetPackForTests();
  });

  it("warns on a malformed row or timer and skips it", () => {
    let pack: ReturnType<typeof packFromFtl> | undefined;
    const lines = warned(() => {
      pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><shipBlueprint name="slug"><escape chance="50" min="30"/></shipBlueprint><escapeTimers hull="-1" lastFuel="80"/></FTL>`,
        },
      ]);
    });
    assert.equal(pack?.escapes, undefined);
    assert.deepEqual(pack?.escapeTimers, { lastFuel: 80 });
    assert.ok(lines.some((line) => line.includes("shipBlueprint slug")));
    assert.ok(lines.some((line) => line.includes('hull="-1"')));
  });
});

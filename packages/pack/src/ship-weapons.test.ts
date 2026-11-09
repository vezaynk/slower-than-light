import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { packFromFtl } from "./ftl.ts";
import { loadPack, resetPackForTests, shipWeaponAnyOf, shipWeapons } from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <shipWeapons ship="JELLY_STATUS_OXYGEN_FIRE"><anyOf>BEAM_FIRE BOMB_FIRE</anyOf></shipWeapons>
  <shipWeapons ship="JELLY_STATUS_DOORS"><anyOf>BEAM_FIRE BOMB_FIRE</anyOf></shipWeapons>
</FTL>`;

function warned(run: () => void): string[] {
  const lines: string[] = [];
  const restore = onPackWarning((line) => lines.push(line));
  try {
    run();
  } finally {
    restore();
  }
  return lines;
}

describe("ship weapons gap", () => {
  it("reads anyOf and writes it back", () => {
    const pack = packFromFtl([{ path: "data/gap.xml", xml: GAP }]);
    assert.deepEqual(pack.shipWeapons, [
      { ship: "JELLY_STATUS_OXYGEN_FIRE", anyOf: ["BEAM_FIRE", "BOMB_FIRE"] },
      { ship: "JELLY_STATUS_DOORS", anyOf: ["BEAM_FIRE", "BOMB_FIRE"] },
    ]);
    const back = packFromFtl([{ path: "data/gap.xml", xml: emitGapDocument(pack) }]);
    assert.deepEqual(back.shipWeapons, pack.shipWeapons);
  });

  it("lets a later row for the same ship replace the list", () => {
    const pack = packFromFtl([
      {
        path: "data/gap.xml",
        xml: `<FTL>
          <shipWeapons ship="JELLY_STATUS_OXYGEN_FIRE"><anyOf>BEAM_FIRE</anyOf></shipWeapons>
          <shipWeapons ship="JELLY_STATUS_OXYGEN_FIRE"><anyOf>BOMB_FIRE</anyOf></shipWeapons>
        </FTL>`,
      },
    ]);
    assert.deepEqual(pack.shipWeapons, [
      { ship: "JELLY_STATUS_OXYGEN_FIRE", anyOf: ["BOMB_FIRE"] },
    ]);
  });

  it("falls back to FTL's list with one warning when the tag is missing", () => {
    loadPack({}, "base");
    try {
      const lines = warned(() => {
        assert.deepEqual(shipWeaponAnyOf("JELLY_STATUS_OXYGEN_FIRE"), ["BEAM_FIRE", "BOMB_FIRE"]);
        assert.deepEqual(shipWeaponAnyOf("JELLY_STATUS_OXYGEN_FIRE"), ["BEAM_FIRE", "BOMB_FIRE"]);
        assert.deepEqual(shipWeaponAnyOf("JELLY_STATUS_DOORS"), ["BEAM_FIRE", "BOMB_FIRE"]);
        assert.equal(shipWeaponAnyOf("JELLY"), undefined);
      });
      assert.equal(lines.length, 2);
      assert.ok(lines[0]?.includes('ship="JELLY_STATUS_OXYGEN_FIRE"'));
    } finally {
      resetPackForTests();
    }
  });

  it("uses an appended override instead of FTL's list", () => {
    loadPack(packFromFtl([{ path: "data/gap.xml", xml: GAP }]), "base");
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><shipWeapons ship="JELLY_STATUS_OXYGEN_FIRE"><anyOf>LASER_BURST_1</anyOf></shipWeapons></FTL>`,
        },
      ]),
      "append",
    );
    try {
      assert.deepEqual(shipWeaponAnyOf("JELLY_STATUS_OXYGEN_FIRE"), ["LASER_BURST_1"]);
      assert.ok(shipWeapons().some((row) => row.ship === "JELLY_STATUS_DOORS"));
    } finally {
      resetPackForTests();
    }
  });
});

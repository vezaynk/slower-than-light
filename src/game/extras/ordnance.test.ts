import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FLAK1_NARROW_CUTS,
  FLAK1_WIDE_CUTS,
  ORDNANCE,
  bombIgnores,
  flak1AimRolls,
  flak1Landing,
  type FlakRoom,
} from "./ordnance.ts";

describe("ordnance", () => {
  it("includes both a flak gun and a bomb", () => {
    const kinds = new Set(ORDNANCE.map((w) => w.kind));
    assert.ok(kinds.has("flak"));
    assert.ok(kinds.has("bomb"));
  });

  it("gives Flak I at least three pellets", () => {
    const scatter = ORDNANCE.find((w) => w.name === "Flak I");
    assert.ok(scatter);
    assert.ok(scatter.shots >= 3);
  });

  it("makes the Fire Bomb spend a missile and ignore shields and evasion", () => {
    const cask = ORDNANCE.find((w) => w.name === "Fire Bomb");
    assert.ok(cask);
    assert.equal(cask.ammo, true);
    assert.equal(bombIgnores(cask), true);
  });
});

const narrow: FlakRoom = { id: "aim", x: 1, y: 1, w: 2, h: 1 };
const north: FlakRoom = { id: "north", x: 1, y: 0, w: 2, h: 1 };
const square: FlakRoom = { id: "box", x: 0, y: 0, w: 2, h: 2 };
const beside: FlakRoom = { id: "beside", x: 0, y: -1, w: 2, h: 1 };

describe("Flak I room odds", () => {
  it("keeps the printed 1x2 and 2x2 cuts", () => {
    // Flak (Weapons), Flak Gun Mark I. The last 1x2 corner is 0.18 because the printed percents sum to 99.99.
    assert.equal(FLAK1_NARROW_CUTS[0], 0.4421);
    assert.equal(FLAK1_NARROW_CUTS[4], 0.4421 + 0.1196 * 4);
    assert.equal(FLAK1_NARROW_CUTS[6], 0.4421 + 0.1196 * 4 + 0.0363 * 2);
    assert.equal(FLAK1_NARROW_CUTS[FLAK1_NARROW_CUTS.length - 1], 1);
    assert.equal(FLAK1_WIDE_CUTS[0], 0.8408);
    assert.equal(FLAK1_WIDE_CUTS[FLAK1_WIDE_CUTS.length - 1], 1);
    assert.equal(flak1AimRolls(narrow), true);
    assert.equal(flak1AimRolls(square), true);
    assert.equal(flak1AimRolls({ id: "dot", x: 0, y: 0, w: 1, h: 1 }), false);
  });

  it("stays in a 1x2 on the main-room roll and steps onto a long side, a short side, or a corner", () => {
    assert.deepEqual(flak1Landing([narrow, north], "aim", 0.442), { kind: "stay" });
    assert.deepEqual(flak1Landing([narrow, north], "aim", 0.4421), { kind: "room", roomId: "north" });
    // First short-side tile is west of the pair, which is empty here.
    assert.deepEqual(flak1Landing([narrow, north], "aim", 0.4421 + 0.1196 * 4), { kind: "miss" });
    // First corner is also empty.
    assert.deepEqual(flak1Landing([narrow], "aim", 0.4421 + 0.1196 * 4 + 0.0363 * 2), { kind: "miss" });
  });

  it("stays in a 2x2 on the main-room roll and can leave through a side tile", () => {
    assert.deepEqual(flak1Landing([square, beside], "box", 0.8407), { kind: "stay" });
    assert.deepEqual(flak1Landing([square, beside], "box", 0.8408), { kind: "room", roomId: "beside" });
    assert.deepEqual(flak1Landing([square], "box", 0.99), { kind: "miss" });
  });
});

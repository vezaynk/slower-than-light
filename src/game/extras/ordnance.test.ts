import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ORDNANCE, bombIgnores } from "./ordnance.ts";

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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { navAllows } from "./cited-nav.ts";

describe("Adv. FTL Navigation", () => {
  it("allows a visited beacon the fleet overtook", () => {
    assert.equal(navAllows({ visited: true, col: 2 }, 4), true);
  });

  it("allows a visited beacon still ahead of the fleet", () => {
    assert.equal(navAllows({ visited: true, col: 6 }, 3), true);
  });

  it("refuses an unvisited beacon the fleet overtook", () => {
    assert.equal(navAllows({ visited: false, col: 1 }, 5), false);
  });

  it("refuses an unvisited beacon still ahead of the fleet", () => {
    assert.equal(navAllows({ visited: false, col: 7 }, 2), false);
  });
});

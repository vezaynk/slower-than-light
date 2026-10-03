import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scramblerBlocks } from "./cited-scrambler.ts";

describe("scramblerBlocks", () => {
  it("is true only for Defense Drone I, Defense Drone II, and the Anti-Combat Drone", () => {
    assert.equal(scramblerBlocks("ward"), true);
    assert.equal(scramblerBlocks("ward2"), true);
    assert.equal(scramblerBlocks("wardcut"), true);
  });

  it("is false for other drone kinds and an empty kind", () => {
    for (const kind of ["striker", "beam", "board", "patch", "hull", "combat2", "ionintruder", ""]) {
      assert.equal(scramblerBlocks(kind), false, kind || "(empty)");
    }
  });
});

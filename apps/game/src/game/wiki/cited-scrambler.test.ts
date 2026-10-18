import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scramblerBlocks } from "./cited-scrambler.ts";

describe("scramblerBlocks", () => {
  it("is true only for Defense Drone I, Defense Drone II, and the Anti-Combat Drone", () => {
    assert.equal(scramblerBlocks("DEFENSE_1"), true);
    assert.equal(scramblerBlocks("DEFENSE_2"), true);
    assert.equal(scramblerBlocks("ANTI_DRONE"), true);
  });

  it("is false for other drone kinds and an empty kind", () => {
    for (const kind of [
      "COMBAT_1",
      "COMBAT_BEAM",
      "BOARDER",
      "REPAIR",
      "SHIP_REPAIR",
      "COMBAT_2",
      "BOARDER_ION",
      "",
    ]) {
      assert.equal(scramblerBlocks(kind), false, kind || "(empty)");
    }
  });
});

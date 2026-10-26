import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allAchievements, onPackWarning } from "@stl/pack";
import { createGame } from "../sim.ts";
import { conditionMet } from "./achievement-track.ts";

describe("achievement conditions", () => {
  it("gives every achievement a condition and reads only known values", () => {
    const rows = allAchievements();
    assert.deepEqual(
      rows.filter((row) => !row.condition).map((row) => row.id),
      [],
    );
    const g = createGame(1);
    const warnings: string[] = [];
    const restore = onPackWarning((line) => warnings.push(line));
    try {
      for (const row of rows) if (row.condition) conditionMet(g, row.condition);
    } finally {
      restore();
    }
    assert.deepEqual(warnings, []);
  });
});

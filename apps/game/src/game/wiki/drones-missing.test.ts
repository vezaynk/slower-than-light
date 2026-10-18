import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MISSING_DRONES } from "./drones-missing.ts";

/** SwarmKind ids already implemented in swarm.ts. */
const EXISTING = [
  "DEFENSE_1",
  "DEFENSE_2",
  "ANTI_DRONE",
  "COMBAT_1",
  "COMBAT_BEAM",
  "BOARDER",
  "REPAIR",
  "SHIP_REPAIR",
];

describe("missing drone schematics", () => {
  it("does not reuse a SwarmKind id", () => {
    const ids = MISSING_DRONES.map((row) => row.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.equal(EXISTING.includes(id), false, id);
    }
  });

  it("cites Drone Control on every row", () => {
    assert.ok(MISSING_DRONES.length > 0);
    for (const row of MISSING_DRONES) {
      assert.match(row.source, /Drone Control/);
      assert.match(row.source, /^Wiki page "Drone Control", section ".+"$/);
    }
  });

  it("keeps the schematic headings that are not already implemented", () => {
    assert.deepEqual(
      MISSING_DRONES.map((row) => [row.id, row.name, row.power, row.cooldown]),
      [
        ["BOARDER_ION", "Ion Intruder Drone", 3, "Pulse time varies between 8.2 and 10 seconds"],
        ["COMBAT_2", "Combat Drone Mark II", 4, null],
        ["COMBAT_BEAM_2", "Anti-Ship Beam Drone II", 3, null],
        ["firedrone", "Anti-Ship Fire Drone", 3, null],
        ["BATTLE", "Anti-Personnel Drone", 2, null],
        [
          "DRONE_SHIELD",
          "Shield Overcharger",
          3,
          "8s/10s/13s/16s/20s for 0/1/2/3/4 existing layers",
        ],
        [
          "DRONE_SHIELD_PLAYER",
          "Shield Overcharger +",
          2,
          "8s/10s/13s/16s/20s for 0/1/2/3/4 existing layers",
        ],
      ],
    );
    for (const row of MISSING_DRONES) {
      assert.ok(row.note.length > 0, row.id);
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HullSpec } from "../hulls.ts";
import { MANTIS_HULLS } from "./hulls-mantis.ts";

const DRAW = ["shields", "engines", "oxygen", "medbay", "weapons"] as const;
const SEATS = new Set(["p-pilot", "p-engines", "p-weapons", "p-shields"]);

function kinCount(hull: HullSpec, kin: HullSpec["crew"][number]["kin"]): number {
  return hull.crew.filter((c) => c.kin === kin).length;
}

function reactorDraw(hull: HullSpec): number {
  let n = 0;
  for (const id of DRAW) n += hull.systems[id]?.[1] ?? 0;
  for (const kit of Object.values(hull.kits)) n += kit?.power ?? 0;
  return n;
}

describe("Mantis cruiser loadouts", () => {
  it("lists the three layouts", () => {
    assert.deepEqual(
      MANTIS_HULLS.map((h) => [h.id, h.layout, h.name, h.cruiser]),
      [
        ["mantis-a", "A", "The Gila Monster", "Mantis Cruiser"],
        ["mantis-b", "B", "The Basilisk", "Mantis Cruiser"],
        ["mantis-c", "C", "The Theseus", "Mantis Cruiser"],
      ],
    );
  });

  it("uses the published reactor and stores", () => {
    const byId = Object.fromEntries(MANTIS_HULLS.map((h) => [h.id, h]));
    assert.deepEqual(
      [byId["mantis-a"].reactor, byId["mantis-a"].fuel, byId["mantis-a"].missiles, byId["mantis-a"].parts],
      [7, 16, 16, 0],
    );
    assert.deepEqual(
      [byId["mantis-b"].reactor, byId["mantis-b"].fuel, byId["mantis-b"].missiles, byId["mantis-b"].parts],
      [11, 16, 0, 15],
    );
    assert.deepEqual(
      [byId["mantis-c"].reactor, byId["mantis-c"].fuel, byId["mantis-c"].missiles, byId["mantis-c"].parts],
      [8, 16, 20, 0],
    );
  });

  it("counts crew kin and stays inside the reactor", () => {
    const byId = Object.fromEntries(MANTIS_HULLS.map((h) => [h.id, h]));
    assert.deepEqual(
      [kinCount(byId["mantis-a"], "blade"), kinCount(byId["mantis-a"], "shell"), kinCount(byId["mantis-a"], "voidlung")],
      [3, 1, 0],
    );
    assert.deepEqual(
      [kinCount(byId["mantis-b"], "blade"), kinCount(byId["mantis-b"], "shell"), kinCount(byId["mantis-b"], "voidlung")],
      [2, 0, 0],
    );
    assert.deepEqual(
      [kinCount(byId["mantis-c"], "blade"), kinCount(byId["mantis-c"], "shell"), kinCount(byId["mantis-c"], "voidlung")],
      [1, 1, 1],
    );
    for (const hull of MANTIS_HULLS) {
      assert.ok(reactorDraw(hull) <= hull.reactor, hull.id);
      for (const seat of hull.crew) assert.ok(SEATS.has(seat.room), seat.room);
      for (const [level, power] of Object.values(hull.systems)) {
        assert.ok(power <= level);
      }
    }
  });
});

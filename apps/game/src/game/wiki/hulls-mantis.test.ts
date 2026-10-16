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
        ["PLAYER_SHIP_MANTIS", "A", "The Gila Monster", "Mantis Cruiser"],
        ["PLAYER_SHIP_MANTIS_2", "B", "The Basilisk", "Mantis Cruiser"],
        ["PLAYER_SHIP_MANTIS_3", "C", "The Theseus", "Mantis Cruiser"],
      ],
    );
  });

  it("uses the published reactor and stores", () => {
    const byId = Object.fromEntries(MANTIS_HULLS.map((h) => [h.id, h]));
    assert.deepEqual(
      [byId["PLAYER_SHIP_MANTIS"].reactor, byId["PLAYER_SHIP_MANTIS"].fuel, byId["PLAYER_SHIP_MANTIS"].missiles, byId["PLAYER_SHIP_MANTIS"].parts],
      [7, 16, 16, 0],
    );
    assert.deepEqual(
      [byId["PLAYER_SHIP_MANTIS_2"].reactor, byId["PLAYER_SHIP_MANTIS_2"].fuel, byId["PLAYER_SHIP_MANTIS_2"].missiles, byId["PLAYER_SHIP_MANTIS_2"].parts],
      [11, 16, 0, 15],
    );
    assert.deepEqual(
      [byId["PLAYER_SHIP_MANTIS_3"].reactor, byId["PLAYER_SHIP_MANTIS_3"].fuel, byId["PLAYER_SHIP_MANTIS_3"].missiles, byId["PLAYER_SHIP_MANTIS_3"].parts],
      [8, 16, 20, 0],
    );
  });

  it("counts crew kin and stays inside the reactor", () => {
    const byId = Object.fromEntries(MANTIS_HULLS.map((h) => [h.id, h]));
    assert.deepEqual(
      [kinCount(byId["PLAYER_SHIP_MANTIS"], "mantis"), kinCount(byId["PLAYER_SHIP_MANTIS"], "engi"), kinCount(byId["PLAYER_SHIP_MANTIS"], "anaerobic")],
      [3, 1, 0],
    );
    assert.deepEqual(
      [kinCount(byId["PLAYER_SHIP_MANTIS_2"], "mantis"), kinCount(byId["PLAYER_SHIP_MANTIS_2"], "engi"), kinCount(byId["PLAYER_SHIP_MANTIS_2"], "anaerobic")],
      [2, 0, 0],
    );
    assert.deepEqual(
      [kinCount(byId["PLAYER_SHIP_MANTIS_3"], "mantis"), kinCount(byId["PLAYER_SHIP_MANTIS_3"], "engi"), kinCount(byId["PLAYER_SHIP_MANTIS_3"], "anaerobic")],
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

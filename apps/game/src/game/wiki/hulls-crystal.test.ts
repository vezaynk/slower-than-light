import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CRYSTAL_HULLS } from "./hulls-crystal.ts";

const DRAW = ["shields", "engines", "oxygen", "medbay", "weapons"] as const;
const SEATS = ["p-pilot", "p-engines", "p-weapons", "p-shields"];

function draw(hull: (typeof CRYSTAL_HULLS)[number]): number {
  let n = 0;
  for (const id of DRAW) n += hull.systems[id]?.[1] ?? 0;
  for (const kit of Object.values(hull.kits)) n += kit?.power ?? 0;
  return n;
}

describe("crystal cruiser hulls", () => {
  it("names Bravais and Carnelian", () => {
    assert.deepEqual(
      CRYSTAL_HULLS.map((h) => [h.id, h.layout, h.name, h.cruiser]),
      [
        ["crystal-a", "A", "Bravais", "Crystal Cruiser"],
        ["crystal-b", "B", "Carnelian", "Crystal Cruiser"],
      ],
    );
  });

  it("copies reactor and resources", () => {
    for (const hull of CRYSTAL_HULLS) {
      assert.equal(hull.reactor, 8, hull.id);
      assert.equal(hull.fuel, 16, hull.id);
      assert.equal(hull.missiles, 0, hull.id);
      assert.equal(hull.parts, 0, hull.id);
      assert.equal(hull.source, `The Crystal Cruiser, Layout ${hull.layout}`);
    }
  });

  it("counts the listed crew", () => {
    const a = CRYSTAL_HULLS.find((h) => h.id === "crystal-a");
    const b = CRYSTAL_HULLS.find((h) => h.id === "crystal-b");
    assert.ok(a && b);
    assert.equal(a.crew.filter((c) => c.kin === "plain").length, 2);
    assert.equal(a.crew.filter((c) => c.kin === "shard").length, 2);
    assert.equal(a.crew.length, 4);
    assert.equal(b.crew.filter((c) => c.kin === "shard").length, 3);
    assert.equal(b.crew.filter((c) => c.kin === "plain").length, 0);
    assert.equal(b.crew.length, 3);
    for (const hull of CRYSTAL_HULLS) {
      assert.equal(new Set(hull.crew.map((c) => c.room)).size, hull.crew.length, hull.id);
      for (const seat of hull.crew) assert.ok(SEATS.includes(seat.room), `${hull.id} ${seat.room}`);
    }
  });

  it("keeps powered bars and kit power inside the reactor", () => {
    const a = CRYSTAL_HULLS.find((h) => h.id === "crystal-a");
    const b = CRYSTAL_HULLS.find((h) => h.id === "crystal-b");
    assert.ok(a && b);
    assert.equal(a.systems.shields?.[0], 2);
    assert.equal(a.systems.engines?.[0], 2);
    assert.equal(a.systems.oxygen?.[0], 1);
    assert.equal(a.systems.medbay?.[0], 1);
    assert.equal(a.systems.medbay?.[1], 0);
    assert.equal(a.systems.weapons?.[0], 3);
    assert.equal(a.systems.weapons?.[1], 3);
    assert.deepEqual(a.weapons, ["crystalburst", "heavycrystal"]);
    assert.deepEqual(Object.keys(a.kits), []);
    assert.deepEqual(b.weapons, []);
    assert.equal(b.systems.weapons?.[0], 1);
    assert.equal(b.systems.weapons?.[1], 0);
    assert.equal(b.systems.medbay?.[0], 1);
    assert.equal(b.systems.medbay?.[1], 1);
    assert.equal(b.kits.sling?.level, 1);
    assert.equal(b.kits.sling?.power, 1);
    assert.equal(b.kits.veil?.level, 1);
    assert.equal(b.kits.veil?.power, 1);
    for (const hull of CRYSTAL_HULLS) {
      assert.ok(draw(hull) <= hull.reactor, `${hull.id} draws ${draw(hull)}`);
      assert.equal(hull.systems.pilot?.[0], 1, hull.id);
      assert.equal(hull.systems.sensors?.[0], 1, hull.id);
      assert.equal(hull.systems.doors?.[0], 1, hull.id);
      for (const [id, pair] of Object.entries(hull.systems)) {
        assert.ok(pair, id);
        assert.ok(pair[1] <= pair[0], `${hull.id} ${id}`);
      }
      assert.deepEqual(hull.augments, ["vengeance"]);
      assert.deepEqual(hull.unfitted, []);
    }
  });
});

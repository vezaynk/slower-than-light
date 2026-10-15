import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import "./base.ts";
import { emitPack } from "./emit.ts";
import { parsePack } from "./parse.ts";
import { allAugments, allCrew, allDrones, allHulls, allSectors, allStores, allSystems, allWeapons, resetPackForTests } from "./registry.ts";

describe("base pack xml", () => {
  it("round-trips the loaded records and matches the snapshot", () => {
    resetPackForTests();
    const pack = {
      crew: allCrew(),
      weapons: allWeapons(),
      augments: allAugments(),
      drones: allDrones(),
      systems: allSystems(),
      hulls: allHulls(),
      sectors: allSectors(),
      stores: allStores(),
    };
    const xml = emitPack(pack);
    const back = parsePack(xml);
    assert.deepEqual(back.crew, pack.crew);
    assert.deepEqual(back.weapons, pack.weapons);
    assert.deepEqual(back.augments, pack.augments);
    assert.deepEqual(back.drones, pack.drones);
    assert.deepEqual(back.systems, pack.systems);
    assert.deepEqual(back.hulls, pack.hulls);
    assert.deepEqual(back.sectors, pack.sectors);
    assert.deepEqual(back.stores, pack.stores);
    const golden = readFileSync(new URL("./base.xml", import.meta.url), "utf8");
    assert.equal(xml, golden);
  });
});

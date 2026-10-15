import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import "./base.ts";
import { allAugments, allCrew, allDrones, allEmptyBeacons, allEvents, allFillerLists, allHulls, allSectors, allStores, allSystems, allTunes, allWeapons, emitPack, parsePack, resetPackForTests } from "@stl/pack";

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
      tunes: allTunes(),
      events: allEvents(),
      lists: allFillerLists(),
      empties: allEmptyBeacons(),
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
    assert.deepEqual(back.tunes, pack.tunes);
    assert.deepEqual(back.events, pack.events);
    assert.deepEqual(back.lists, pack.lists);
    assert.deepEqual(back.empties, pack.empties);
    const golden = readFileSync(new URL("../../../../../packages/campaign/base.xml", import.meta.url), "utf8");
    assert.equal(xml, golden);
  });
});

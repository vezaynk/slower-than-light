import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  allEvents,
  allFactions,
  allStores,
  allSystems,
  allTunes,
  parsePack,
  rewardTable,
} from "@stl/pack";
import { campaignXml } from "./xml.ts";

describe("campaign document", () => {
  it("matches the committed base.xml", async () => {
    const golden = readFileSync(new URL("../base.xml", import.meta.url), "utf8");
    assert.equal(await campaignXml(), golden);
  });

  it("restores the loaded event records", async () => {
    const parsed = parsePack(await campaignXml());
    const loaded = allEvents();
    const events = parsed.events ?? [];
    assert.equal(events.length, loaded.length);
    for (let i = 0; i < loaded.length; i++) assert.deepEqual(events[i], loaded[i]);
    assert.deepEqual(parsed.rewards, rewardTable());
    assert.deepEqual(parsed.factions, allFactions());
    assert.deepEqual(parsed.systems, allSystems());
    assert.deepEqual(parsed.tunes, allTunes());
    assert.deepEqual(parsed.stores, allStores());
  });
});

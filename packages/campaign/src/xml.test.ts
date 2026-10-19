import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { hullPictureFiles } from "@stl/catalog/src/ship-art.ts";
import { layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { emitPack, overlayGap, packFromFtl, parsePack } from "@stl/pack";
import {
  campaignPack,
  campaignXml,
  splitCampaign,
  standInSectorsXml,
  standInShipsXml,
} from "./xml.ts";

describe("campaign document", () => {
  it("matches the committed base.xml", () => {
    const golden = readFileSync(new URL("../base.xml", import.meta.url), "utf8");
    assert.equal(campaignXml(), golden);
  });

  it("merges the body and the gap back into the catalog", () => {
    const pack = campaignPack();
    const parts = splitCampaign(pack);
    const body = parsePack(emitPack(parts.body, { crew: "identity", sector: "body" }));
    // Ships and sectors are ftl.dat blueprints and sector_data.xml, beside the layout text and picture files.
    const ftl = packFromFtl(
      [
        { path: "data/blueprints.xml", xml: standInShipsXml() },
        { path: "data/sector_data.xml", xml: standInSectorsXml() },
        ...hullPictureFiles(),
      ],
      layoutFiles(),
    );
    body.hulls = ftl.hulls;
    body.sectors = ftl.sectors;
    const merged = overlayGap(
      body,
      parsePack(emitPack(parts.gap, { crew: "stats", sector: "gap" })),
    );
    assert.deepEqual(merged.crew, pack.crew);
    assert.deepEqual(merged.weapons, pack.weapons);
    assert.deepEqual(merged.augments, pack.augments);
    assert.deepEqual(merged.drones, pack.drones);
    assert.deepEqual(merged.systems, pack.systems);
    assert.deepEqual(merged.tunes, pack.tunes);
    assert.deepEqual(merged.hulls, pack.hulls);
    assert.deepEqual(merged.sectors, pack.sectors);
    assert.deepEqual(merged.events, pack.events);
    assert.deepEqual(merged.lists, pack.lists);
    assert.deepEqual(merged.stores, pack.stores);
    assert.deepEqual(merged.rewards, pack.rewards);
    assert.deepEqual(merged.factions, pack.factions);
    assert.deepEqual(merged.empties, pack.empties);
    assert.equal(merged.facts, undefined);
  });

  it("keeps the store and the rewards, and leaves blueprints in the stand-in", () => {
    const xml = campaignXml();
    const parsed = parsePack(xml);
    assert.ok(parsed.rewards);
    assert.ok((parsed.stores?.length ?? 0) > 0);
    assert.equal(parsed.weapons?.length, 0);
    assert.equal(parsed.events?.length, 0);
    assert.equal(xml.includes("<weaponBlueprint"), false);
    assert.equal(xml.includes("<event "), false);
  });
});

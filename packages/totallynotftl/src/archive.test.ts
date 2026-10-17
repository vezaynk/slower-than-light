import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { campaignPack, campaignXml } from "@stl/campaign";
import { layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { extractFtlDat } from "@stl/ftldat";
import { packFromExtract } from "@stl/hyperspace";
import { overlayGap, parsePack } from "@stl/pack";
import { standInDat, standInXml } from "./archive.ts";

describe("totallynotftl.dat", () => {
  it("rebuilds the committed xml and archive", async () => {
    const xml = standInXml();
    const goldenXml = readFileSync(new URL("../totallynotftl.xml", import.meta.url), "utf8");
    assert.equal(xml, goldenXml);
    assert.equal(xml.includes("<facts"), false);
    assert.equal(xml.includes("<maxHealth"), false);
    assert.equal(xml.includes("<customStore"), false);
    assert.equal(xml.includes("<rewards"), false);
    assert.equal(xml.includes("<weaponBlueprint"), true);
    const built = await standInDat();
    const extracted = await extractFtlDat(built);
    assert.equal(extracted.documents.length, 1);
    assert.equal(extracted.documents[0]?.path, "data/stand-in.xml");
    assert.equal(extracted.documents[0]?.xml, goldenXml);
    assert.equal(extracted.assets.size, 0);
    const layouts = layoutFiles();
    assert.equal(extracted.text.size, layouts.length);
    for (const file of layouts) assert.equal(extracted.text.get(file.path), file.text);
    const parsed = parsePack(xml);
    assert.equal(parsed.facts, undefined);
    assert.equal(parsed.stores?.length, 0);
    assert.equal(parsed.rewards, undefined);
    assert.equal(parsed.weapons?.find((row) => row.id === "LASER_BURST_3")?.name, "Burst Laser II");
    assert.equal(parsed.crew?.find((row) => row.id === "human")?.name, "Human");
    const golden = readFileSync(new URL("../totallynotftl.dat", import.meta.url));
    assert.equal(built.byteLength, golden.byteLength);
    assert.equal(Buffer.compare(built, golden), 0);
  });

  it("merges the stand-in archive with the gap file back into the catalog", async () => {
    const pack = campaignPack();
    const merged = overlayGap(
      packFromExtract(await extractFtlDat(await standInDat())),
      parsePack(campaignXml()),
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
});

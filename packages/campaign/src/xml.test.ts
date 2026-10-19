import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { hullPictureFiles } from "@stl/catalog/src/ship-art.ts";
import { layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { extractFtlZip, packFtlZip } from "@stl/ftldat";
import { applyFtlMod, packFromExtract } from "@stl/hyperspace";
import { parsePack } from "@stl/pack";
import {
  campaignPack,
  gapModFiles,
  standInSectorsXml,
  standInShipsXml,
  standInXml,
} from "./xml.ts";

const encoder = new TextEncoder();

describe("campaign document", () => {
  it("matches the committed gap files and base.ftl", async () => {
    const files = gapModFiles();
    for (const file of files) {
      const golden = readFileSync(new URL(`../mod/${file.path}`, import.meta.url), "utf8");
      assert.equal(file.xml, golden, file.path);
    }
    const built = packFtlZip(
      files.map((file) => ({ path: file.path, bytes: encoder.encode(file.xml) })),
    );
    const golden = readFileSync(new URL("../base.ftl", import.meta.url));
    assert.equal(built.byteLength, golden.byteLength);
    assert.equal(Buffer.compare(built, golden), 0);
    const extracted = await extractFtlZip(built);
    assert.deepEqual(
      extracted.documents.map((doc) => doc.path),
      files.map((file) => file.path),
    );
  });

  it("merges the body and the gap mod back into the catalog", () => {
    const pack = campaignPack();
    const merged = packFromExtract(
      applyFtlMod(
        {
          documents: [
            { path: "data/stand-in.xml", xml: standInXml() },
            { path: "data/blueprints.xml", xml: standInShipsXml() },
            { path: "data/sector_data.xml", xml: standInSectorsXml() },
            ...hullPictureFiles(),
          ],
          text: new Map(layoutFiles().map((file) => [file.path, file.text])),
          assets: new Map(),
        },
        {
          documents: gapModFiles(),
          text: new Map(),
          assets: new Map(),
        },
      ),
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
    const xml = gapModFiles().find((file) => file.path === "data/gap.xml")?.xml ?? "";
    const parsed = parsePack(xml);
    assert.ok(parsed.rewards);
    assert.ok((parsed.stores?.length ?? 0) > 0);
    assert.equal(parsed.weapons?.length, 0);
    assert.equal(parsed.events?.length, 0);
    assert.equal(xml.includes("<weaponBlueprint"), false);
    assert.equal(xml.includes("<event "), false);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { emitMod } from "@stl/hyperspace";
import { extractFtlDat } from "@stl/ftldat";
import { packFromFtl } from "@stl/pack";
import { standInDat, standInMod, standInXml } from "./archive.ts";

describe("totallynotftl.dat", () => {
  it("rebuilds the committed xml, archive, and mod file", async () => {
    const xml = await standInXml();
    const goldenXml = readFileSync(new URL("../totallynotftl.xml", import.meta.url), "utf8");
    assert.equal(xml, goldenXml);
    const built = await standInDat();
    const extracted = await extractFtlDat(built);
    assert.equal(extracted.documents.length, 1);
    assert.equal(extracted.documents[0]?.path, "data/stand-in.xml");
    assert.equal(extracted.documents[0]?.xml, goldenXml);
    assert.equal(extracted.assets.size, 0);
    const pack = packFromFtl(extracted.documents);
    assert.equal(pack.facts, true);
    assert.equal(pack.names?.pool.includes("Ada Voss"), true);
    assert.equal(pack.names?.syllables.includes("ka"), true);
    const laser = pack.weapons?.find((row) => row.id === "lineburst");
    assert.equal(laser?.kind, "laser");
    assert.equal(laser?.name, "Burst Laser II");
    assert.match(laser?.blurb ?? "", /2 power/);
    assert.match(laser?.blurb ?? "", /Charges in 12 seconds/);
    assert.match(laser?.blurb ?? "", /3 shots of 1 damage/);
    assert.match(laser?.blurb ?? "", /Costs 80 scrap/);
    assert.doesNotMatch(laser?.blurb ?? "", /FTL art/);
    const beam = pack.weapons?.find((row) => row.id === "mini");
    assert.equal(beam?.lengthTiles, 1);
    assert.match(beam?.blurb ?? "", /Length 1 tile/);
    assert.match(
      pack.systems?.find((row) => row.id === "shields")?.detail ?? "",
      /Store cost 125 scrap/,
    );
    assert.equal(pack.systems?.find((row) => row.id === "shields")?.name, "Shields");
    assert.equal(pack.systems?.find((row) => row.id === "shields")?.slot, "sys");
    assert.equal(pack.systems?.find((row) => row.id === "veil")?.name, "Cloaking");
    assert.equal(pack.systems?.find((row) => row.id === "veil")?.slot, "kit");
    assert.equal(pack.systems?.find((row) => row.id === "engines")?.name, "Engines");
    assert.equal(pack.tunes?.find((row) => row.id === "shields")?.start, 2);
    assert.equal(pack.augments?.find((row) => row.id === "feed")?.name, "Automated Re-loader");
    assert.match(pack.augments?.find((row) => row.id === "feed")?.detail ?? "", /10%/);
    assert.equal(pack.drones?.find((row) => row.id === "striker")?.name, "Combat Drone Mark I");
    assert.equal(pack.crew?.find((row) => row.id === "plain")?.name, "Human");
    assert.match(pack.crew?.find((row) => row.id === "plain")?.detail ?? "", /Health 100/);
    assert.match(pack.crew?.find((row) => row.id === "spark")?.detail ?? "", /Supplies 1 power/);
    assert.match(pack.crew?.find((row) => row.id === "voidlung")?.detail ?? "", /Drains oxygen/);
    const golden = readFileSync(new URL("../totallynotftl.dat", import.meta.url));
    assert.equal(built.byteLength, golden.byteLength);
    assert.equal(Buffer.compare(built, golden), 0);
    const goldenMod = readFileSync(
      new URL("../totallynotftl.hyperspace.xml", import.meta.url),
      "utf8",
    );
    assert.equal(emitMod(pack), goldenMod);
    assert.equal(await standInMod(), goldenMod);
  });
});

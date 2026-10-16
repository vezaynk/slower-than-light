import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { extractFtlDat } from "@stl/ftldat";
import { packFromFtl } from "@stl/pack";
import { standInDat, standInXml } from "./archive.ts";

describe("totallynotftl.dat", () => {
  it("rebuilds the committed xml and archive", async () => {
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
    const laser = pack.weapons?.find((row) => row.id === "LASER_BURST_3");
    assert.equal(laser?.kind, "laser");
    assert.equal(laser?.name, "Burst Laser II");
    assert.match(laser?.blurb ?? "", /2 power/);
    assert.match(laser?.blurb ?? "", /Charges in 12 seconds/);
    assert.match(laser?.blurb ?? "", /3 shots of 1 damage/);
    assert.match(laser?.blurb ?? "", /Costs 80 scrap/);
    assert.doesNotMatch(laser?.blurb ?? "", /FTL art/);
    const beam = pack.weapons?.find((row) => row.id === "BEAM_1");
    assert.equal(beam?.lengthTiles, 1);
    assert.match(beam?.blurb ?? "", /Length 1 tile/);
    assert.match(
      pack.systems?.find((row) => row.id === "shields")?.detail ?? "",
      /Store cost 125 scrap/,
    );
    assert.equal(pack.systems?.find((row) => row.id === "shields")?.name, "Shields");
    assert.equal(pack.systems?.find((row) => row.id === "shields")?.slot, "sys");
    assert.equal(pack.systems?.find((row) => row.id === "cloaking")?.name, "Cloaking");
    assert.equal(pack.systems?.find((row) => row.id === "cloaking")?.slot, "kit");
    assert.equal(pack.systems?.find((row) => row.id === "engines")?.name, "Engines");
    assert.equal(pack.tunes?.find((row) => row.id === "shields")?.start, 2);
    assert.equal(pack.augments?.find((row) => row.id === "AUTO_COOLDOWN")?.name, "Automated Re-loader");
    assert.match(pack.augments?.find((row) => row.id === "AUTO_COOLDOWN")?.detail ?? "", /10%/);
    assert.equal(pack.drones?.find((row) => row.id === "COMBAT_1")?.name, "Combat Drone Mark I");
    assert.equal(pack.crew?.find((row) => row.id === "human")?.name, "Human");
    assert.match(pack.crew?.find((row) => row.id === "human")?.detail ?? "", /Health 100/);
    assert.match(pack.crew?.find((row) => row.id === "energy")?.detail ?? "", /Supplies 1 power/);
    assert.match(pack.crew?.find((row) => row.id === "anaerobic")?.detail ?? "", /Drains oxygen/);
    const golden = readFileSync(new URL("../totallynotftl.dat", import.meta.url));
    assert.equal(built.byteLength, golden.byteLength);
    assert.equal(Buffer.compare(built, golden), 0);
  });
});

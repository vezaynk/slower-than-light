import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { allEvents, parsePack } from "@stl/pack";
import { campaignXml } from "./xml.ts";

describe("campaign document", () => {
  it("matches the committed base.xml", async () => {
    const golden = readFileSync(new URL("../base.xml", import.meta.url), "utf8");
    assert.equal(await campaignXml(), golden);
  });

  it("restores the loaded event records", async () => {
    const parsed = parsePack(await campaignXml()).events ?? [];
    const loaded = allEvents();
    assert.equal(parsed.length, loaded.length);
    for (let i = 0; i < loaded.length; i++) assert.deepEqual(parsed[i], loaded[i]);
  });
});

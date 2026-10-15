import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { campaignXml } from "./xml.ts";

describe("campaign document", () => {
  it("matches the committed base.xml", async () => {
    const golden = readFileSync(new URL("../base.xml", import.meta.url), "utf8");
    assert.equal(await campaignXml(), golden);
  });
});

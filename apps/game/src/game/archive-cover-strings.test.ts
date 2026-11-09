import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { extractArchive } from "@stl/ftldat";
import { installStandIn } from "@stl/standin";
import { englishStringCoverage, unshownStringKeys } from "./archive-cover.ts";
import { installExtract } from "./archive-play.ts";

describe("unused UI strings", () => {
  it("ignores a known tooltip, reports an unknown string, and keeps a shown string", () => {
    const strings = new Map([
      ["tooltip_oxygen", "Oxygen system hover text"],
      ["mainmenu_newgame", "New Game menu label"],
      ["event_brand_new", "A sentence the game dropped"],
      ["weapon_shown", "Burst laser description"],
      ["tiny", "nope"],
    ]);
    assert.deepEqual(unshownStringKeys(strings, "Burst laser description"), ["event_brand_new"]);
  });
});

const dat = process.env.FTL_DAT?.trim();

describe(
  "ftl.dat unused UI strings",
  { skip: dat ? false : "FTL_DAT is unset", timeout: 300_000 },
  () => {
    after(async () => {
      await installStandIn();
    });

    it("ignores exactly 930 known UI strings and reports no other long string", async () => {
      const raw = await extractArchive(readFileSync(dat!));
      await installExtract(raw);
      const report = englishStringCoverage(raw);
      assert.deepEqual(report.missing, []);
      assert.equal(report.ignored.length, 930);
    });
  },
);

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { extractArchive } from "@stl/ftldat";
import { installStandIn } from "@stl/standin";
import {
  collectEnglishStrings,
  englishStringCoverage,
  shownText,
  unshownStringKeys,
} from "./archive-cover.ts";
import { installExtract } from "./archive-play.ts";
import { knownUnusedUiStrings } from "./unused-ui-strings.ts";

describe("unused UI strings", () => {
  it("ignores a known tooltip, reports an unknown string, and keeps a shown string", () => {
    assert.equal(knownUnusedUiStrings.has("tooltip_oxygen"), true);
    assert.equal(knownUnusedUiStrings.has("text_GAMEOVER_1"), false);
    const strings = new Map([
      ["tooltip_oxygen", "Oxygen system hover text"],
      ["mainmenu_newgame", "New Game menu label"],
      ["event_brand_new", "A sentence the game dropped"],
      ["weapon_shown", "Burst laser description"],
      ["tiny", "nope"],
    ]);
    const missing = unshownStringKeys(strings, "Burst laser description");
    assert.deepEqual(missing, ["event_brand_new"]);
    assert.equal(missing.includes("tooltip_oxygen"), false);
    assert.equal(missing.includes("weapon_shown"), false);
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

    it("ignores exactly the known UI set and reports no other long string", async () => {
      const raw = await extractArchive(readFileSync(dat!));
      await installExtract(raw);
      const strings = collectEnglishStrings(raw);
      const shown = shownText();
      const report = englishStringCoverage(raw);
      assert.deepEqual(report.missing, []);
      assert.deepEqual(unshownStringKeys(strings, shown), []);
      assert.equal(report.ignored.length, knownUnusedUiStrings.size);
      for (const key of report.ignored) assert.equal(knownUnusedUiStrings.has(key), true, key);
      for (const key of knownUnusedUiStrings) assert.equal(report.ignored.includes(key), true, key);
    });
  },
);

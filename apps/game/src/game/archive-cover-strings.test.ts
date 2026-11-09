import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { extractArchive } from "@stl/ftldat";
import { installStandIn } from "@stl/standin";
import {
  collectEnglishStrings,
  englishStringCoverage,
  releaseSkipsString,
  shownText,
  unshownStringKeys,
} from "./archive-cover.ts";
import { installExtract } from "./archive-play.ts";
import { verdictArchiveLines, verdictScoreLine, verdictTitle } from "./interface-copy.ts";

describe("unshown archive strings", () => {
  it("reports an unshown sentence, keeps a shown one, and skips only a demo key", () => {
    assert.equal(releaseSkipsString("gameover_win_demo"), true);
    assert.equal(releaseSkipsString("text_GAMEOVER_1"), false);
    const strings = new Map([
      ["gameover_win_demo", "Demo victory sentence"],
      ["event_brand_new", "A sentence the game dropped"],
      ["text_GAMEOVER_1", "One last explosion marks your fate as your ship is torn apart."],
      ["weapon_shown", "Burst laser description"],
      ["tiny", "nope"],
    ]);
    const missing = unshownStringKeys(
      strings,
      "Burst laser description\nOne last explosion marks your fate as your ship is torn apart.",
    );
    assert.deepEqual(missing, ["event_brand_new"]);
  });

  it("paints the stand-in game-over English when the archive has no table", () => {
    assert.equal(verdictTitle(false), "GAME OVER");
    assert.equal(verdictTitle(true), "VICTORY!");
    assert.equal(verdictScoreLine(12), "SCORE: 12");
    assert.ok(verdictArchiveLines().includes("RESTART"));
    assert.ok(verdictArchiveLines().includes("SCORE: \\1"));
  });
});

const dat = process.env.FTL_DAT?.trim();

describe(
  "ftl.dat strings still not on screen",
  { skip: dat ? false : "FTL_DAT is unset", timeout: 300_000 },
  () => {
    after(async () => {
      await installStandIn();
    });

    it("reports the remaining count and already shows the game-over card", async () => {
      const raw = await extractArchive(readFileSync(dat!));
      await installExtract(raw);
      const strings = collectEnglishStrings(raw);
      const shown = shownText();
      const report = englishStringCoverage(raw);
      const missing = unshownStringKeys(strings, shown);
      const sample = missing.slice(0, 12).join(", ");
      console.log(
        `${missing.length} English strings are not on screen yet (${sample}${missing.length > 12 ? ", …" : ""})`,
      );
      assert.deepEqual(missing, report.missing);
      assert.equal(missing.includes("text_GAMEOVER_1"), false);
      assert.equal(missing.includes("gameover_title_gameover"), false);
      assert.equal(missing.includes("gameover_win"), false);
      assert.equal(missing.includes("gameover_win_demo"), false);
      for (const key of report.ignored) assert.equal(releaseSkipsString(key), true, key);
    });
  },
);

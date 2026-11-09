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
  stringCoverProblems,
  unshownStringKeys,
} from "./archive-cover.ts";
import { installExtract } from "./archive-play.ts";
import { archivePhrase } from "@stl/pack";
import {
  verdictArchiveLines,
  verdictBody,
  verdictScoreLine,
  verdictTitle,
  victoryCrewLine,
} from "./interface-copy.ts";

describe("unshown archive strings", () => {
  it("reports an unshown sentence, keeps a shown one, and skips only a demo key", () => {
    assert.equal(releaseSkipsString("gameover_win_demo"), true);
    assert.equal(releaseSkipsString("text_GAMEOVER_1"), false);
    const strings = new Map([
      ["gameover_win_demo", "Demo victory sentence"],
      ["event_brand_new", "A sentence the game dropped"],
      ["text_GAMEOVER_1", "The Federation's last hope line."],
      ["weapon_shown", "Burst laser description"],
      ["tiny", "nope"],
    ]);
    const missing = unshownStringKeys(
      strings,
      "Burst laser description\nThe Federation's last hope line.",
    );
    assert.deepEqual(missing, ["event_brand_new"]);
    assert.deepEqual(
      stringCoverProblems(new Map([["event_brand_new", "A sentence the game dropped"]]), ""),
      ["1 string key left the screen (event_brand_new)"],
    );
    assert.deepEqual(
      stringCoverProblems(
        new Map([
          ["tooltip_oxygen", "Oxygen system hover text"],
          ["event_brand_new", "A sentence the game dropped"],
        ]),
        "",
      ),
      [],
    );
  });

  it("reads the game-over card from the loaded archive and does not keep a second copy", () => {
    assert.equal(verdictTitle(false), archivePhrase("gameover_title_gameover"));
    assert.equal(verdictTitle(true), archivePhrase("gameover_title_victory"));
    const format = archivePhrase("gameover_score") ?? "";
    assert.match(format, /\\1/);
    assert.equal(verdictScoreLine(12), format.replaceAll("\\1", "12"));
    assert.ok(verdictArchiveLines().includes(archivePhrase("gameover_button_restart")));
    assert.equal(verdictBody(undefined), archivePhrase("gameover_blowup"));
    const comma = archivePhrase("crewlist_comma") ?? "";
    const join = archivePhrase("crewlist_and") ?? "";
    assert.ok(comma.endsWith(" "), comma);
    assert.ok(join.startsWith(" ") && join.endsWith(" "), join);
    assert.equal(victoryCrewLine(["Alice", "Bob", "Carol"]), `Alice${comma}Bob${join}Carol`);
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
      assert.equal(verdictBody(undefined), archivePhrase("gameover_blowup"));
      assert.equal(missing.includes("gameover_blowup"), false);
      assert.equal(missing.includes("gameover_title_gameover"), false);
      assert.equal(missing.includes("gameover_win"), false);
      assert.equal(missing.includes("gameover_win_demo"), false);
      for (const key of report.ignored) assert.equal(releaseSkipsString(key), true, key);
    });
  },
);

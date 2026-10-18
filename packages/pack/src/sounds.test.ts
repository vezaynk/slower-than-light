import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeSounds, readSounds } from "./sounds.ts";

const BASE = `<sounds>
<music>
<track><name>civil</name><explore>civil_explore.ogg</explore><combat>civil_combat.ogg</combat></track>
</music>
<click volume="8">ui/click.wav</click>
<alarm volume="10" loop="true">ui/alarm.wav</alarm>
</sounds>`;

const DLC = `<sounds>
<music></music>
<click volume="2">ui/click-late.wav</click>
</sounds>`;

describe("sounds", () => {
  it("maps cues under audio/waves and tracks under audio/music", () => {
    const set = readSounds(BASE);
    assert.deepEqual(set.tracks[0], {
      name: "civil",
      explore: "audio/music/civil_explore.ogg",
      combat: "audio/music/civil_combat.ogg",
    });
    assert.equal(set.cues.find((cue) => cue.name === "click")?.file, "audio/waves/ui/click.wav");
    assert.equal(set.cues.find((cue) => cue.name === "click")?.volume, 0.8);
    assert.equal(set.cues.find((cue) => cue.name === "alarm")?.loop, true);
  });

  it("lets the later file replace a cue", () => {
    const set = mergeSounds([BASE, DLC]);
    assert.equal(
      set.cues.find((cue) => cue.name === "click")?.file,
      "audio/waves/ui/click-late.wav",
    );
    assert.equal(set.cues.find((cue) => cue.name === "click")?.volume, 0.2);
    assert.equal(set.tracks[0]?.name, "civil");
  });

  it("fails on a document that is not well-formed, like the other archive files", () => {
    assert.throws(() => readSounds("<FTL><broken></FTL>"), /not well-formed/);
  });
});

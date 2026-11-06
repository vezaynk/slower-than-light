import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { extractFtlDat } from "@stl/ftldat";
import { readSounds } from "@stl/pack";
import { LOOP_CUES, SFX_CUES, deathCue, isLoopCue } from "./audio.ts";
import { meleeCues } from "./sim.ts";

/** Archive cues the sim, extras, and wiki modules name directly (not through SFX_CUES). */
const DIRECT = [
  "powerUpSystem",
  "powerDownSystem",
  "powerUpFail",
  "enginesOn",
  "enginesOff",
  "upgradeSystem",
  "autofireOn",
  "autofireOff",
  "weaponReady",
  "jumpReady",
  "lowCrewHealth",
  "repairShip",
  "hullBreach",
  "sysExplosion",
  "environWarning",
  "solarFlare",
  "fleetFireHeavy",
  "fleetFireLight",
  "eventDamage",
  "hoverBeep",
  "batteryStart",
  "batteryStop",
  "cloneArrive",
  "mindControl",
  "mindControlEnd",
  "hackStart",
  "hackLand",
  "shieldDroneCharge",
  "shieldDroneActivate",
  "ionBoarderCharge",
  "shrikeDeath",
];

async function standInCues() {
  const dat = readFileSync(
    new URL("../../../../packages/totallynotftl/totallynotftl.dat", import.meta.url),
  );
  const files = await extractFtlDat(dat);
  const xml = (path: string) => files.documents.find((doc) => doc.path === path)?.xml ?? "";
  const cues = [
    ...readSounds(xml("data/sounds.xml")).cues,
    ...readSounds(xml("data/dlcSounds.xml")).cues,
  ];
  return { cues, files };
}

describe("sound cues", () => {
  it("packs every cue the game plays into the stand-in, each with its wave", async () => {
    const { cues, files } = await standInCues();
    const names = new Set(cues.map((cue) => cue.name));
    const missing = [...DIRECT, ...LOOP_CUES].filter((name) => !names.has(name));
    assert.deepEqual(missing, []);
    // A family plays any packed variant (audio.ts cueFor), so each needs at least one.
    const silent = Object.entries(SFX_CUES)
      .filter(([, family]) => !family.some((name) => names.has(name)))
      .map(([key]) => key);
    assert.deepEqual(silent, []);
    // readSounds keeps the archive path, audio/waves/ included.
    for (const cue of cues) assert.ok(files.assets.has(cue.file), cue.file);
  });

  it("marks each held loop as a loop, as ftl.dat does", async () => {
    const { cues } = await standInCues();
    for (const name of LOOP_CUES) {
      assert.equal(cues.find((cue) => cue.name === name)?.loop, true, name);
      assert.equal(isLoopCue(name), true);
    }
    assert.equal(isLoopCue("brawling"), false);
  });

  it("picks the death family by race and sex, and the melee blow by race", () => {
    assert.equal(deathCue("human"), "death");
    assert.equal(deathCue("human", "female"), "femaleDeath");
    assert.equal(deathCue("engi", "female"), "engiDeath");
    assert.deepEqual(meleeCues("rock"), ["rockThrow", "rockHit"]);
    assert.deepEqual(meleeCues("mantis"), ["mantisSplat"]);
    assert.deepEqual(meleeCues("human"), ["crewLaser"]);
  });
});

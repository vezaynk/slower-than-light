import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import "./pack/base.ts";
import { launchCue, weaponLaunchCue } from "./audio.ts";
import { rememberArchive } from "./pack/media.ts";

describe("weapon launch cue", () => {
  it("picks a packed fire sound, and keeps the kind cue when none is packed", () => {
    const packed = (name: string) => name === "heavy2" || name === "beam1";
    assert.equal(
      launchCue("laser", ["heavy1", "heavy2"], packed, () => 0),
      "heavy2",
    );
    assert.equal(
      launchCue(
        "laser",
        ["heavy1", "heavy2", "heavy3"],
        () => true,
        () => 0,
      ),
      "heavy1",
    );
    assert.equal(
      launchCue(
        "laser",
        ["heavy1", "heavy2", "heavy3"],
        () => true,
        () => 0.99,
      ),
      "heavy3",
    );
    assert.equal(launchCue("laser", ["missing"], packed), "laser");
    assert.equal(launchCue("flak", [], packed), "laser");
    assert.equal(launchCue("bomb", undefined, packed), "missile");
    assert.equal(launchCue("ion", [], packed), "ion");
    assert.equal(launchCue("beam", ["nope"], packed), "beam");
    assert.equal(
      launchCue("missile", ["beam1"], packed, () => 0),
      "beam1",
    );
    assert.equal(launchCue(undefined, [], packed), "laser");
  });

  const created: string[] = [];
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;

  afterEach(async () => {
    await rememberArchive([], new Map());
    created.length = 0;
    if (create) URL.createObjectURL = create;
    else delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    if (revoke) URL.revokeObjectURL = revoke;
    else delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  });

  it("selects the cue the archive packed for that weapon", async () => {
    URL.createObjectURL = () => {
      const url = `blob:cue-${created.length}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = () => {};
    await rememberArchive(
      [
        {
          path: "data/animations.xml",
          xml: `<animations>
<weaponAnim name="LASER_BURST_3"><sheet>x</sheet><desc length="1" x="0" y="0"/><fireSound>heavy1</fireSound><fireSound>heavy2</fireSound></weaponAnim>
<weaponAnim name="ION_1"><sheet>x</sheet><desc length="1" x="0" y="0"/></weaponAnim>
</animations>`,
        },
        {
          path: "data/sounds.xml",
          xml: `<sounds><heavy2 volume="8">ui/heavy2.wav</heavy2></sounds>`,
        },
      ],
      new Map([["audio/waves/ui/heavy2.wav", new Blob([Uint8Array.of(1)])]]),
    );
    assert.equal(
      weaponLaunchCue("LASER_BURST_3", "laser", () => 0),
      "heavy2",
    );
    assert.equal(weaponLaunchCue("ION_1", "ion"), "ion");
    assert.equal(weaponLaunchCue("NOPE", "flak"), "laser");
    assert.equal(weaponLaunchCue("NOPE", "bomb"), "missile");
  });
});

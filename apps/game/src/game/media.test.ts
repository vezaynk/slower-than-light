import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import "./pack/base.ts";
import {
  archiveGeneration,
  crewPoseFrame,
  musicTrack,
  projectileFrame,
  rememberArchive,
  droneLayerUrl,
  roomIconUrl,
  soundCue,
  weaponFrame,
} from "./pack/media.ts";

const created: string[] = [];
const revoked: string[] = [];

const ANIM = `<animations>
<animSheet name="LASER_BURST_3" w="52" h="28" fw="26" fh="14">weapons/LASER_BURST_3.png</animSheet>
<weaponAnim name="LASER_BURST_3"><sheet>LASER_BURST_3</sheet><desc length="2" x="0" y="0"/><chargedFrame>1</chargedFrame><fireFrame>0</fireFrame></weaponAnim>
<animSheet name="laser_shot" w="8" h="8" fw="8" fh="8">weapons/laser_shot.png</animSheet>
<anim name="laser_shot"><sheet>laser_shot</sheet><desc length="1" x="0" y="0"/><time>1</time></anim>
<animSheet name="human" w="64" h="36" fw="16" fh="12">people/human.png</animSheet>
<anim name="human_walk_down"><sheet>human</sheet><desc length="4" x="0" y="0"/><time>1</time></anim>
<anim name="human_type_down"><sheet>human</sheet><desc length="4" x="0" y="1"/><time>1</time></anim>
<anim name="human_punch_down"><sheet>human</sheet><desc length="4" x="0" y="2"/><time>1</time></anim>
</animations>`;

const SOUNDS = `<sounds>
<music><track><name>civil</name><explore>civil_explore.ogg</explore><combat>civil_combat.ogg</combat></track></music>
<laser volume="8">ui/laser.wav</laser>
</sounds>`;

describe("archive media", () => {
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;

  afterEach(async () => {
    await rememberArchive([], new Map());
    created.length = 0;
    revoked.length = 0;
    if (create) URL.createObjectURL = create;
    else delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    if (revoke) URL.revokeObjectURL = revoke;
    else delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  });

  it("keeps weapon frames, crew rows, room masks, and waves", async () => {
    URL.createObjectURL = () => {
      const url = `blob:media-${created.length}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
    };
    const before = archiveGeneration();
    await rememberArchive(
      [
        { path: "data/animations.xml", xml: ANIM },
        { path: "data/sounds.xml", xml: SOUNDS },
      ],
      new Map([
        ["img/weapons/LASER_BURST_3.png", new Blob([Uint8Array.of(1)])],
        ["img/weapons/laser_shot.png", new Blob([Uint8Array.of(2)])],
        ["img/people/human.png", new Blob([Uint8Array.of(3)])],
        ["img/ship/interior/pilot.png", new Blob([Uint8Array.of(4)])],
        ["img/ship/drones/COMBAT_1_on.png", new Blob([Uint8Array.of(5)])],
        ["audio/waves/ui/laser.wav", new Blob([Uint8Array.of(6)])],
        ["audio/music/civil_explore.ogg", new Blob([Uint8Array.of(7)])],
        ["audio/music/civil_combat.ogg", new Blob([Uint8Array.of(8)])],
      ]),
    );
    const idle = weaponFrame("LASER_BURST_3", "idle");
    const charged = weaponFrame("LASER_BURST_3", "charged");
    assert.equal(idle?.url, "blob:media-0");
    assert.equal(idle?.col, 0);
    assert.equal(idle?.row, 1);
    assert.equal(idle?.sy, 14);
    assert.equal(charged?.col, 1);
    assert.equal(charged?.sx, 26);
    assert.equal(weaponFrame("LASER_BURST_3", "fire")?.col, 0);
    const shot = projectileFrame(undefined, "laser");
    assert.equal(shot?.url, "blob:media-1");
    const walk = crewPoseFrame("human", "walk", 1);
    assert.equal(walk?.row, 2);
    assert.equal(walk?.sy, 24);
    assert.equal(walk?.col, 1);
    assert.equal(crewPoseFrame("human", "idle", 0)?.row, 2);
    assert.equal(crewPoseFrame("human", "work", 0)?.row, 1);
    assert.equal(crewPoseFrame("human", "fight", 2)?.row, 0);
    assert.equal(crewPoseFrame("human", "fight", 2)?.sy, 0);
    assert.equal(roomIconUrl("pilot"), "blob:media-3");
    assert.equal(droneLayerUrl("COMBAT_1", "on"), "blob:media-4");
    assert.equal(soundCue("laser")?.volume, 0.8);
    assert.equal(soundCue("laser")?.file, "audio/waves/ui/laser.wav");
    assert.equal(soundCue("click"), undefined);
    assert.equal(musicTrack()?.explore?.size, 1);
    assert.equal(musicTrack()?.combat?.size, 1);
    assert.equal(archiveGeneration(), before + 1);
    await rememberArchive([], new Map());
    assert.equal(weaponFrame("LASER_BURST_3"), undefined);
    assert.equal(roomIconUrl("pilot"), undefined);
    assert.deepEqual(revoked, [
      "blob:media-0",
      "blob:media-1",
      "blob:media-2",
      "blob:media-3",
      "blob:media-4",
    ]);
  });
});

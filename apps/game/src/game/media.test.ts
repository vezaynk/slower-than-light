import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import "./pack/base.ts";
import { cueFor, deathCue, scorePick, syncLoops } from "./audio.ts";
import {
  archiveGeneration,
  archiveImage,
  clipFrame,
  crewLayers,
  crewPoseFrame,
  crewPoseLoops,
  projectileBox,
  tintPixels,
  musicTrack,
  projectileFrame,
  rememberArchive,
  droneLayerUrl,
  roomIconUrl,
  setImageVariant,
  soundCue,
  weaponChargeFrame,
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
<anim name="human_walk_left"><sheet>human</sheet><desc length="4" x="0" y="2"/><time>1</time></anim>
<anim name="slug_walk_down"><sheet>human</sheet><desc length="4" x="0" y="0"/><time>1</time></anim>
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
    setImageVariant({ colorblind: false, tablet: false, lang: "en" });
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
    const left = crewPoseFrame("human", "walk", 0, "left");
    assert.equal(left?.row, 0);
    assert.equal(left?.mirror, false);
    assert.equal(crewPoseFrame("human", "walk", 0, "up")?.row, 2);
    assert.equal(crewPoseFrame("human", "walk", 0, "up")?.mirror, false);
    const flipped = crewPoseFrame("slug", "walk", 0, "left");
    assert.equal(flipped?.row, 2);
    assert.equal(flipped?.mirror, true);
    // Frame 0 of the walk sheet is the planted figure. Cycling it walks in place.
    assert.equal(crewPoseLoops("human", "idle", { cycle: true }), false);
    assert.equal(crewPoseLoops("human", "idle", { loopAll: true, dir: "left" }), false);
    assert.equal(crewPoseLoops("human", "work", { cycle: true }), true);
    assert.equal(crewPoseLoops("human", "walk", { loopAll: true }), true);
    assert.equal(crewPoseLoops("human", "walk", { cycle: true }), false);
    assert.equal(crewPoseLoops("human", "fight", { loopAll: true }), true);
    assert.equal(crewPoseLoops("crystal", "idle", { cycle: true }), true);
    assert.equal(roomIconUrl("pilot"), "blob:media-3");
    assert.equal(droneLayerUrl("COMBAT_1", "on"), "blob:media-4");
    assert.equal(soundCue("laser")?.volume, 0.8);
    assert.equal(soundCue("laser")?.file, "audio/waves/ui/laser.wav");
    assert.equal(soundCue("click"), undefined);
    assert.equal(musicTrack("civil")?.explore?.size, 1);
    assert.equal(musicTrack("civil")?.combat?.size, 1);
    assert.equal(musicTrack(), undefined);
    assert.equal(archiveGeneration(), before + 1);
    await rememberArchive([], new Map());
    assert.equal(crewPoseLoops("human", "idle", { cycle: true }), true);
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

  it("reads a real archive's names: drone blueprints, crew layers, and FTL cue names", async () => {
    URL.createObjectURL = () => {
      const url = `blob:media-${created.length}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = () => {};
    await rememberArchive(
      [
        {
          path: "data/sounds.xml",
          xml: `<sounds>\n<lightLaser2 volume="5">weapons/lightLaser2.wav</lightLaser2>\n<hitHull1 volume="10" loop="true">hits/hitHull1.wav</hitHull1>\n</sounds>`,
        },
      ],
      new Map([
        ["img/ship/drones/COMBAT_2_base.png", new Blob([Uint8Array.of(1)])],
        ["img/people/human_layer1.png", new Blob([Uint8Array.of(2)])],
        ["img/people/human_layer2.png", new Blob([Uint8Array.of(3)])],
        ["audio/waves/weapons/lightLaser2.wav", new Blob([Uint8Array.of(4)])],
        ["audio/waves/hits/hitHull1.wav", new Blob([Uint8Array.of(5)])],
      ]),
    );
    // "striker2" is the game's look for Combat Drone Mark II. Its picture is the blueprint's.
    assert.equal(droneLayerUrl("striker2", "base"), "blob:media-0");
    assert.equal(droneLayerUrl("COMBAT_2", "base"), "blob:media-0");

    // The catalog human has no colorList, so every layer the archive holds counts. The last is the uniform.
    const layers = crewLayers("human", "#336699");
    assert.deepEqual(
      layers.map((layer) => layer.url),
      ["blob:media-1", "blob:media-2"],
    );
    assert.deepEqual(layers[0]?.tint, { r: 255, g: 255, b: 255, a: 1 });
    assert.deepEqual(layers[1]?.tint, { r: 51, g: 102, b: 153, a: 1 });
    assert.deepEqual(crewLayers("engi", "#336699"), []);

    // The game's "laser" plays FTL's lightLaser family; "click" has no FTL cue.
    assert.equal(cueFor("laser")?.name, "lightLaser2");
    assert.equal(cueFor("hit")?.name, "hitHull1");
    assert.equal(cueFor("hit")?.loop, true);
    assert.equal(cueFor("click"), undefined);
  });

  it("draws a charge image only when that clip and its sheet are packed", async () => {
    URL.createObjectURL = () => {
      const url = `blob:charge-${created.length}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = () => {};
    await rememberArchive(
      [
        {
          path: "data/animations.xml",
          xml: `<animations>
<animSheet name="LASER_BURST_3" w="26" h="14" fw="26" fh="14">weapons/LASER_BURST_3.png</animSheet>
<weaponAnim name="LASER_BURST_3"><sheet>LASER_BURST_3</sheet><desc length="1" x="0" y="0"/><chargeImage>laser_glow</chargeImage></weaponAnim>
<animSheet name="laser_glow" w="26" h="14" fw="26" fh="14">weapons/laser_glow.png</animSheet>
<anim name="laser_glow"><sheet>laser_glow</sheet><desc length="1" x="0" y="0"/><time>1</time></anim>
<weaponAnim name="ION_1"><sheet>missing</sheet><desc length="1" x="0" y="0"/><chargeImage>no_glow</chargeImage></weaponAnim>
<animSheet name="ghost" w="8" h="8" fw="8" fh="8">weapons/ghost.png</animSheet>
<anim name="ghost"><sheet>ghost</sheet><desc length="1" x="0" y="0"/><time>1</time></anim>
<weaponAnim name="BEAM_1"><sheet>ghost</sheet><desc length="1" x="0" y="0"/><chargeImage>ghost</chargeImage></weaponAnim>
</animations>`,
        },
      ],
      new Map([
        ["img/weapons/LASER_BURST_3.png", new Blob([Uint8Array.of(1)])],
        ["img/weapons/laser_glow.png", new Blob([Uint8Array.of(2)])],
      ]),
    );
    assert.equal(weaponChargeFrame("LASER_BURST_3")?.url, "blob:charge-1");
    assert.equal(weaponChargeFrame("ION_1"), undefined);
    assert.equal(weaponChargeFrame("BEAM_1"), undefined);
    assert.equal(weaponChargeFrame("LASER_BURST_1"), undefined);
  });

  it("frames an effect clip and leaves a missing picture alone", async () => {
    URL.createObjectURL = () => {
      const url = `blob:fx-${created.length}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = () => {};
    await rememberArchive(
      [
        {
          path: "data/animations.xml",
          xml: `<animations>
<animSheet name="fire_large" w="64" h="16" fw="16" fh="16">effects/fire_large.png</animSheet>
<anim name="fire_large"><sheet>fire_large</sheet><desc length="4" x="0" y="0"/><time>1</time></anim>
</animations>`,
        },
        {
          path: "data/sounds.xml",
          xml: `<sounds><fire volume="8" loop="true">ui/fire.wav</fire><doorOpen volume="8">ui/doorOpen.wav</doorOpen></sounds>`,
        },
      ],
      new Map([
        ["img/effects/fire_large.png", new Blob([Uint8Array.of(1)])],
        ["img/stars/bg_dullstars.png", new Blob([Uint8Array.of(2)])],
        ["img/ships_noglow/kestral_base.png", new Blob([Uint8Array.of(3)])],
        ["audio/waves/ui/fire.wav", new Blob([Uint8Array.of(4)])],
        ["audio/waves/ui/doorOpen.wav", new Blob([Uint8Array.of(5)])],
      ]),
    );
    const frame = clipFrame("fire_large", 1);
    assert.equal(frame?.sx, 16);
    assert.equal(frame?.fw, 16);
    assert.equal(clipFrame("fire_large", 4)?.sx, 0);
    assert.equal(clipFrame("missing", 0), undefined);
    assert.equal(archiveImage("img/stars/bg_dullstars.png"), "blob:fx-1");
    assert.equal(archiveImage("img/ships_noglow/kestral_base.png"), "blob:fx-2");
    assert.equal(archiveImage("img/icons/not-a-real-icon.png"), undefined);
    assert.equal(soundCue("fire")?.loop, true);
    assert.equal(soundCue("doorOpen")?.file, "audio/waves/ui/doorOpen.wav");
    const generation = archiveGeneration();
    setImageVariant({ colorblind: true });
    assert.equal(archiveGeneration(), generation);
    assert.equal(archiveImage("img/stars/bg_dullstars.png"), "blob:fx-1");
    setImageVariant({ colorblind: false });
  });

  it("picks the title score, a sector score, and a death cue without a speaker", () => {
    assert.deepEqual(scorePick({ phase: "title", sectorId: "CIVILIAN_SECTOR", combat: true }), {
      track: "title",
      mode: "explore",
    });
    assert.equal(scorePick({ phase: "map", sectorId: "ENGI_SECTOR", combat: false }).track, "engi");
    assert.equal(
      scorePick({ phase: "combat", sectorId: "ENGI_SECTOR", combat: true }).mode,
      "combat",
    );
    assert.equal(
      scorePick({ phase: "map", sectorId: "NO_SUCH_SECTOR", combat: false }).track,
      "civilian",
    );
    assert.equal(deathCue("rock"), "rockDeath");
    assert.equal(deathCue("mantis"), "mantisDeath");
    assert.equal(deathCue("human"), "death1");
    assert.equal(deathCue(undefined), "death1");
    syncLoops({ fire: true, repair: false });
  });

  it("multiplies a layer by its tint, and keeps a projectile's proportions", () => {
    const pixels = Uint8ClampedArray.of(255, 255, 255, 255, 128, 64, 0, 200);
    tintPixels(pixels, { r: 51, g: 102, b: 153, a: 0.5 });
    assert.deepEqual([...pixels], [51, 102, 153, 128, 26, 26, 0, 100]);
    assert.deepEqual(projectileBox(40, 10, 18), { w: 18, h: 4.5 });
    assert.deepEqual(projectileBox(8, 8, 16), { w: 16, h: 16 });
  });
});

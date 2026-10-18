import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { campaignPack, campaignXml } from "@stl/campaign";
import { hullPictureFiles } from "@stl/catalog/src/ship-art.ts";
import { WEAPON_MOUNTS } from "@stl/catalog/src/weapon-mounts.ts";
import { layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { extractFtlDat } from "@stl/ftldat";
import { packFromExtract } from "@stl/hyperspace";
import {
  overlayGap,
  parsePack,
  pictureForRooms,
  readAnimations,
  readBitmapFont,
  readSounds,
} from "@stl/pack";
import { standInDat, standInImages, standInXml } from "./archive.ts";
import { standInMedia } from "./media.ts";

describe("totallynotftl.dat", () => {
  it("rebuilds the committed xml and archive", async () => {
    const xml = standInXml();
    const goldenXml = readFileSync(new URL("../totallynotftl.xml", import.meta.url), "utf8");
    assert.equal(xml, goldenXml);
    assert.equal(xml.includes("<facts"), false);
    assert.equal(xml.includes("<maxHealth"), false);
    assert.equal(xml.includes("<customStore"), false);
    assert.equal(xml.includes("<rewards"), false);
    assert.equal(xml.includes("<weaponBlueprint"), true);
    const built = await standInDat();
    const extracted = await extractFtlDat(built);
    const pictures = hullPictureFiles();
    const media = await standInMedia();
    assert.equal(extracted.documents.length, 1 + pictures.length + media.documents.length);
    assert.equal(extracted.documents[0]?.path, "data/stand-in.xml");
    assert.equal(extracted.documents[0]?.xml, goldenXml);
    assert.equal(goldenXml.includes("<weaponArt>"), false);
    assert.equal(goldenXml.includes("<droneImage>"), false);
    for (const file of pictures) {
      assert.equal(extracted.documents.find((doc) => doc.path === file.path)?.xml, file.xml);
    }
    const anim = readAnimations(
      extracted.documents.find((doc) => doc.path === "data/animations.xml")?.xml ?? "",
    );
    assert.ok(anim.weapons.some((row) => row.name === "LASER_BURST_3"));
    assert.equal(anim.clips.find((row) => row.name === "LASER_BURST_3_shot")?.time, 1);
    assert.ok(anim.clips.some((row) => row.name === "human_walk_down"));
    const sounds = readSounds(
      extracted.documents.find((doc) => doc.path === "data/sounds.xml")?.xml ?? "",
    );
    assert.equal(sounds.cues.find((row) => row.name === "laser")?.file, "audio/waves/ui/laser.wav");
    assert.equal(sounds.cues.find((row) => row.name === "laser")?.volume, 0.8);
    assert.equal(sounds.tracks[0]?.name, "civil");
    assert.equal(sounds.tracks[0]?.explore, "audio/music/civil_explore.ogg");
    assert.equal(sounds.tracks[0]?.combat, "audio/music/civil_combat.ogg");
    const images = standInImages(pictures);
    assert.equal(extracted.assets.size, images.length + media.assets.length);
    for (const path of [
      "img/weapons/LASER_BURST_3.png",
      "img/weapons/laser_shot.png",
      "img/people/human.png",
      "img/people/female_base.png",
      "img/people/green_destination.png",
      "img/ship/drones/COMBAT_1_base.png",
      "img/ship/drones/COMBAT_1_on.png",
      "img/ship/drones/striker2_base.png",
      "img/ship/interior/pilot.png",
      "audio/waves/ui/click.wav",
      "audio/music/civil_explore.ogg",
      "fonts/JustinFont8.font",
      "fonts/JustinFont10.font",
      "fonts/JustinFont12Bold.font",
    ]) {
      assert.ok(extracted.assets.has(path), path);
    }
    for (const [path, blob] of extracted.assets) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      assertMagic(path, bytes, blob.type);
    }
    const title = readBitmapFont(
      new Uint8Array(await extracted.assets.get("fonts/JustinFont12Bold.font")!.arrayBuffer()),
    );
    assert.equal(title?.lineTop, 12);
    assert.ok(title?.glyphs.some((glyph) => glyph.ch === 65));
    assert.ok(title?.glyphs.some((glyph) => glyph.ch === 97));
    const layouts = layoutFiles();
    assert.equal(pictures.length, layouts.length);
    assert.equal(extracted.text.size, layouts.length);
    for (const file of layouts) assert.equal(extracted.text.get(file.path), file.text);
    const parsed = parsePack(xml);
    assert.equal(parsed.facts, undefined);
    assert.equal(parsed.stores?.length, 0);
    assert.equal(parsed.rewards, undefined);
    assert.equal(parsed.weapons?.find((row) => row.id === "LASER_BURST_3")?.name, "Burst Laser II");
    assert.equal(parsed.crew?.find((row) => row.id === "human")?.name, "Human");
    const golden = readFileSync(new URL("../totallynotftl.dat", import.meta.url));
    assert.equal(built.byteLength, golden.byteLength);
    assert.equal(Buffer.compare(built, golden), 0);
  });

  it("merges the stand-in archive with the gap file back into the catalog", async () => {
    const pack = campaignPack();
    const merged = overlayGap(
      packFromExtract(await extractFtlDat(await standInDat())),
      parsePack(campaignXml()),
    );
    assert.deepEqual(merged.crew, pack.crew);
    assert.deepEqual(merged.weapons, pack.weapons);
    assert.deepEqual(merged.augments, pack.augments);
    assert.deepEqual(merged.drones, pack.drones);
    assert.deepEqual(merged.systems, pack.systems);
    assert.deepEqual(merged.tunes, pack.tunes);
    assert.deepEqual(merged.hulls, pack.hulls);
    assert.deepEqual(merged.sectors, pack.sectors);
    assert.deepEqual(merged.events, pack.events);
    assert.deepEqual(merged.lists, pack.lists);
    assert.deepEqual(merged.stores, pack.stores);
    assert.deepEqual(merged.rewards, pack.rewards);
    assert.deepEqual(merged.factions, pack.factions);
    assert.deepEqual(merged.empties, pack.empties);
    assert.equal(merged.facts, undefined);
    const kestrel = merged.hulls?.find((hull) => hull.id === "PLAYER_SHIP_HARD");
    assert.equal(kestrel?.img, "kestral");
    assert.equal(kestrel?.layout, "kestral");
    assert.deepEqual(kestrel?.picture, pictureForRooms(kestrel?.grid?.rooms ?? []));
    assert.deepEqual(kestrel?.mounts, WEAPON_MOUNTS.kestral);
    assert.deepEqual(kestrel?.cloakOffset, { x: 0, y: 0 });
    assert.deepEqual(kestrel?.floorOffset, { x: 0, y: 0 });
    assert.ok((kestrel?.gibs?.length ?? 0) >= 1);
    const mounts = Object.values(WEAPON_MOUNTS).reduce((count, rows) => count + rows.length, 0);
    assert.equal(Object.keys(WEAPON_MOUNTS).length, 69);
    assert.equal(mounts, 325);
    const fighter = merged.hulls?.find((hull) => hull.id === "REBEL_SKINNY");
    assert.equal(fighter?.layout, "rebel-invader");
    assert.equal(fighter?.mounts, undefined);
    assert.equal(fighter?.gibs?.length, 1);
  });
});

function assertMagic(path: string, bytes: Uint8Array, type: string) {
  const mark = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
  if (path.endsWith(".png")) {
    assert.equal(type, "image/png", path);
    assert.equal(bytes[0], 0x89, path);
    assert.equal(bytes[1], 0x50, path);
    return;
  }
  if (path.endsWith(".wav")) {
    assert.equal(type, "audio/wav", path);
    assert.equal(mark, "RIFF", path);
    return;
  }
  if (path.endsWith(".ogg")) {
    assert.equal(type, "audio/ogg", path);
    assert.equal(mark, "OggS", path);
    return;
  }
  if (path.endsWith(".font")) {
    assert.equal(type, "application/octet-stream", path);
    assert.equal(mark, "FONT", path);
    return;
  }
  assert.fail(path);
}

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { campaignPack } from "@stl/campaign";
import { hullPictureFiles } from "@stl/catalog/src/ship-art.ts";
import { MOUNT_IMAGES, WEAPON_MOUNTS } from "@stl/catalog/src/weapon-mounts.ts";
import { layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { extractFtlDat, extractFtlZip, readPkg } from "@stl/ftldat";
import { applyFtlMod, packFromExtract } from "@stl/hyperspace";
import { packFromFtl, parsePack, readAnimations, readBitmapFont, readSounds } from "@stl/pack";
import {
  standInAchievementsXml,
  standInDat,
  standInEventFiles,
  standInImages,
  standInSectorsXml,
  standInShipsXml,
} from "./archive.ts";
import { standInMedia } from "./media.ts";
import { TEXT_LISTS_XML } from "./text-lists.ts";

describe("totallynotftl.dat", () => {
  it("keeps every file of the archive committed under archive/, and nothing else", async () => {
    const root = new URL("../archive/", import.meta.url);
    const files = await readPkg(await standInDat());
    const committed = readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => `${entry.parentPath}/${entry.name}`.slice(root.pathname.length))
      .sort();
    assert.deepEqual(committed, files.map((file) => file.path).sort());
    for (const file of files) {
      assert.equal(
        Buffer.compare(readFileSync(new URL(file.path, root)), file.bytes),
        0,
        file.path,
      );
    }
  });

  it("rebuilds the committed archive", async () => {
    const events = standInEventFiles();
    assert.ok(events.some((file) => file.xml.includes("<event ")));
    for (const file of events) {
      const goldenXml = readFileSync(new URL(`../archive/${file.path}`, import.meta.url), "utf8");
      assert.equal(file.xml, goldenXml, file.path);
      assert.equal(file.xml.includes("<facts"), false, file.path);
      assert.equal(file.xml.includes("<maxHealth"), false, file.path);
      assert.equal(file.xml.includes("<customStore"), false, file.path);
      assert.equal(file.xml.includes("<rewards"), false, file.path);
      assert.equal(file.xml.includes("<weaponBlueprint"), false, file.path);
      assert.equal(file.xml.includes("<augBlueprint"), false, file.path);
      assert.equal(file.xml.includes("<droneBlueprint"), false, file.path);
      assert.equal(file.xml.includes("<systemBlueprint"), false, file.path);
      assert.equal(file.xml.includes("<crew>"), false, file.path);
      assert.equal(file.xml.includes("<crew/>"), false, file.path);
      assert.equal(file.xml.includes("<sectorDescription"), false, file.path);
      assert.equal(file.xml.includes("<shipBlueprint"), false, file.path);
      assert.equal(file.xml.includes("<race"), false, file.path);
      assert.equal(file.xml.includes("<weaponArt>"), false, file.path);
      assert.equal(file.xml.includes("<droneImage>"), false, file.path);
    }
    const eventsXml = events.find((file) => file.path === "data/events.xml")?.xml ?? "";
    const built = await standInDat();
    const extracted = await extractFtlDat(built);
    const pictures = hullPictureFiles();
    const media = await standInMedia();
    assert.equal(
      extracted.documents.length,
      events.length + 5 + pictures.length + media.documents.length,
    );
    assert.match(
      extracted.documents.find((doc) => doc.path === "data/text-eo.xml")?.xml ?? "",
      /Malrapida ol lumo/,
    );
    for (const file of events) {
      assert.equal(extracted.documents.find((doc) => doc.path === file.path)?.xml, file.xml);
    }
    // Ships are ftl.dat blueprints, as a real archive writes them; the event files carry none.
    assert.equal(
      extracted.documents.find((doc) => doc.path === "data/blueprints.xml")?.xml,
      standInShipsXml(),
    );
    assert.equal(
      extracted.documents.find((doc) => doc.path === "data/sector_data.xml")?.xml,
      standInSectorsXml(),
    );
    // Achievements are ftl.dat's data/achievements.xml; when each is earned is the gap mod's.
    assert.equal(
      extracted.documents.find((doc) => doc.path === "data/achievements.xml")?.xml,
      standInAchievementsXml(),
    );
    assert.equal(standInAchievementsXml().includes("<condition"), false);
    assert.equal(
      extracted.documents.find((doc) => doc.path === "data/text_lists.xml")?.xml,
      TEXT_LISTS_XML,
    );

    for (const file of pictures) {
      assert.equal(extracted.documents.find((doc) => doc.path === file.path)?.xml, file.xml);
    }
    const anim = readAnimations(
      extracted.documents.find((doc) => doc.path === "data/animations.xml")?.xml ?? "",
    );
    const laser = anim.weapons.find((row) => row.name === "LASER_BURST_3");
    assert.equal(laser?.fireSounds[0], "lightLaser1");
    assert.deepEqual(laser?.firePoint, { x: laser?.mountX, y: laser?.mountY });
    assert.equal(laser?.chargeImage, undefined);
    assert.equal(anim.weapons.find((row) => row.name === "SHOTGUN")?.fireSounds[0], "lightLaser1");
    assert.equal(
      anim.weapons.find((row) => row.name === "MISSILES_1")?.fireSounds[0],
      "smallMissile1",
    );
    assert.equal(anim.weapons.find((row) => row.name === "BOMB_1")?.fireSounds[0], "smallMissile1");
    assert.equal(anim.weapons.find((row) => row.name === "BEAM_1")?.fireSounds[0], "beam1");
    assert.equal(anim.weapons.find((row) => row.name === "ION_1")?.fireSounds[0], "ionShoot1");
    assert.equal(anim.clips.find((row) => row.name === "LASER_BURST_3_shot")?.time, 1);
    assert.ok(anim.clips.some((row) => row.name === "human_walk_down"));
    assert.equal(anim.clips.find((row) => row.name === "fire_large")?.length, 4);
    assert.equal(anim.clips.find((row) => row.name === "asteroid0")?.length, 1);
    assert.equal(anim.clips.find((row) => row.name === "explosion_big1")?.time, 1);
    const sounds = readSounds(
      extracted.documents.find((doc) => doc.path === "data/sounds.xml")?.xml ?? "",
    );
    // FTL's own cue names, so a real archive and the stand-in are read the same way.
    assert.equal(
      sounds.cues.find((row) => row.name === "lightLaser1")?.file,
      "audio/waves/ui/lightLaser1.wav",
    );
    assert.equal(sounds.cues.find((row) => row.name === "lightLaser1")?.volume, 0.8);
    assert.equal(
      sounds.cues.find((row) => row.name === "laser"),
      undefined,
    );
    assert.equal(sounds.tracks.length, 18);
    assert.equal(sounds.tracks[0]?.name, "civilian");
    assert.equal(sounds.tracks[0]?.explore, "audio/music/bp_MUS_CivilEXPLORE.ogg");
    assert.equal(sounds.tracks[0]?.combat, "audio/music/bp_MUS_CivilBATTLE.ogg");
    assert.equal(
      sounds.tracks.find((row) => row.name === "title")?.explore,
      "audio/music/bp_MUS_TitleScreen.ogg",
    );
    assert.equal(sounds.tracks.find((row) => row.name === "title")?.combat, undefined);
    assert.equal(
      sounds.cues.find((row) => row.name === "doorOpen")?.file,
      "audio/waves/ui/doorOpen.wav",
    );
    assert.equal(sounds.cues.find((row) => row.name === "fire")?.loop, true);
    assert.equal(sounds.cues.find((row) => row.name === "repair")?.loop, true);
    const images = standInImages(pictures);
    assert.equal(extracted.assets.size, images.length + media.assets.length);
    for (const path of [
      "img/weapons/LASER_BURST_3.png",
      "img/weapons/laser_shot.png",
      "img/people/human_base.png",
      "img/people/human_layer1.png",
      "img/people/female_base.png",
      "img/people/female_layer1.png",
      "img/people/green_destination.png",
      "img/ship/drones/COMBAT_1_base.png",
      "img/ship/drones/COMBAT_1_on.png",
      "img/ship/drones/COMBAT_2_base.png",
      "img/ship/interior/pilot.png",
      "audio/waves/ui/hitHull1.wav",
      "audio/waves/ui/doorOpen.wav",
      "audio/waves/ui/fire.wav",
      "audio/music/bp_MUS_CivilEXPLORE.ogg",
      "audio/music/bp_MUS_TitleScreen.ogg",
      "audio/music/bp_MUS_LastStand.ogg",
      "img/ships_noglow/kestral_base.png",
      "img/ships_glow/kestral_base.png",
      "img/stars/bg_dullstars.png",
      "img/map/map_icon_ship.png",
      "img/ship/fleet/fleet_1_med_warning.png",
      "img/effects/fire_large.png",
      "img/effects/asteroid0.png",
      "img/ui_icons/icon_scrap.png",
      "img/mouse/pointerValid.png",
      "fonts/JustinFont8.font",
      "fonts/JustinFont10.font",
      "fonts/JustinFont12Bold.font",
      "fonts/JustinFont11Bold.font",
      "fonts/num_font.font",
      "fonts/HL1.font",
      "fonts/HL2.font",
      "fonts/c&c.font",
      "fonts/c&cnew.font",
      "fonts/eo.font",
      "audio/waves/ui/miss.wav",
      "img/loc-eo/statusUI/menu.png",
    ]) {
      assert.ok(extracted.assets.has(path), path);
    }
    // A look key with a blueprint behind it has no files of its own.
    for (const path of ["img/people/human.png", "img/ship/drones/striker2_base.png"]) {
      assert.equal(extracted.assets.has(path), false, path);
    }
    const glow = new Uint8Array(
      await extracted.assets.get("img/ships_glow/kestral_base.png")!.arrayBuffer(),
    );
    const dark = new Uint8Array(
      await extracted.assets.get("img/ships_noglow/kestral_base.png")!.arrayBuffer(),
    );
    const cloak = new Uint8Array(
      await extracted.assets.get("img/ship/kestral_cloak.png")!.arrayBuffer(),
    );
    assert.equal(Buffer.compare(glow, dark) === 0, false);
    assert.equal(Buffer.compare(glow, cloak) === 0, false);
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
    const parsed = parsePack(eventsXml);
    assert.equal(parsed.facts, undefined);
    assert.equal(parsed.stores?.length, 0);
    assert.equal(parsed.rewards, undefined);
    assert.equal(parsed.weapons?.length, 0);
    assert.deepEqual(parsed.crew, []);
    const shipsXml = standInShipsXml();
    const ships = packFromFtl([{ path: "data/blueprints.xml", xml: shipsXml }]);
    assert.equal(ships.weapons?.find((row) => row.id === "LASER_BURST_3")?.name, "Burst Laser II");
    assert.equal(ships.weapons?.find((row) => row.id === "LASER_BURST_3")?.gap, 0);
    assert.equal(shipsXml.includes("<weaponBlueprint"), true);
    assert.equal(shipsXml.includes("<shotGap"), false);
    assert.equal(eventsXml.includes("<race"), false);
    assert.match(standInShipsXml(), /<crewBlueprint name="human">\s*<title>Human<\/title>/);
    const golden = readFileSync(new URL("../totallynotftl.dat", import.meta.url));
    assert.equal(built.byteLength, golden.byteLength);
    assert.equal(Buffer.compare(built, golden), 0);
  });

  it("merges the stand-in archive with the gap mod back into the catalog", async () => {
    const pack = campaignPack();
    const gap = await extractFtlZip(
      readFileSync(new URL("../../campaign/base.ftl", import.meta.url)),
    );
    const merged = packFromExtract(applyFtlMod(await extractFtlDat(await standInDat()), gap));
    assert.deepEqual(merged.crew, pack.crew);
    assert.deepEqual(merged.achievements, pack.achievements);
    assert.deepEqual(merged.weapons, pack.weapons);
    assert.deepEqual(merged.augments, pack.augments);
    assert.deepEqual(merged.drones, pack.drones);
    assert.deepEqual(merged.systems, pack.systems);
    assert.deepEqual(merged.tunes, pack.tunes);
    assert.deepEqual(merged.hulls, pack.hulls);
    assert.deepEqual(merged.sectors, pack.sectors);
    const extra = new Set(["STAND_IN_BEACON", "STAND_IN_NESTED"]);
    const byId = <T extends { id: string }>(rows: T[] | undefined) =>
      [...(rows ?? [])].sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(
      byId(merged.events?.filter((event) => !extra.has(event.id))),
      byId(pack.events),
    );
    const gates = merged.events?.find((event) => event.id === "STANDIN_GATES");
    assert.equal(gates?.body, "Gates.");
    assert.deepEqual(
      gates?.choices.map((choice) => choice.label),
      ["Medbay band.", "Reactor cap.", "Hack one.", "Hack two.", "Continue."],
    );
    assert.equal(gates?.choices[0]?.hidden, true);
    assert.equal(gates?.choices[0]?.minLevel, 2);
    assert.equal(gates?.choices[1]?.blue, false);
    assert.equal(gates?.choices[1]?.maxLevel, 24);
    assert.equal(gates?.choices[2]?.maxGroup, 0);
    assert.equal(gates?.choices[3]?.hidden, true);
    assert.equal(gates?.choices[3]?.minLevel, 2);
    assert.equal(gates?.choices[4]?.hidden, true);
    assert.equal(gates?.choices[4]?.reqs, undefined);
    assert.deepEqual(
      merged.events?.find((event) => event.id === "STAND_IN_BEACON"),
      {
        id: "STAND_IN_BEACON",
        dest: "STAND_IN_BEACON",
        flag: "STAND_IN_BEACON",
        aliases: [],
        sectors: [],
        body: "Nothing moves.",
        choices: [],
        texts: ["Nothing moves.", "The beacon holds still."],
      },
    );
    assert.deepEqual(
      merged.events?.find((event) => event.id === "STAND_IN_NESTED"),
      {
        id: "STAND_IN_NESTED",
        dest: "STAND_IN_NESTED",
        flag: "STAND_IN_NESTED",
        aliases: [],
        sectors: [],
        body: "",
        choices: [],
        openings: [{ text: "The near reading." }, { load: "STAND_IN_MORE" }],
      },
    );
    assert.deepEqual(
      merged.textLists?.map((row) => row.id),
      ["STAND_IN_CALM", "STAND_IN_MORE", "STAND_IN_NEST", "NAME_SYLLABLES", "CREW_POOL"],
    );
    assert.deepEqual(merged.textLists?.find((row) => row.id === "STAND_IN_CALM")?.lines, [
      { text: "Nothing moves." },
      { text: "The beacon holds still." },
    ]);
    assert.deepEqual(merged.textLists?.find((row) => row.id === "STAND_IN_NEST")?.lines, [
      { text: "The near reading." },
      { load: "STAND_IN_MORE" },
    ]);
    assert.deepEqual(merged.lists, pack.lists);
    assert.equal(merged.lists?.find((row) => row.id === "STANDIN_EMPTY")?.entries.length, 0);
    assert.deepEqual(merged.stores, pack.stores);
    assert.deepEqual(merged.rewards, pack.rewards);
    assert.deepEqual(merged.factions, pack.factions);
    assert.deepEqual(merged.empties, pack.empties);
    assert.deepEqual(merged.shipClasses, pack.shipClasses);
    assert.equal(merged.facts, undefined);
    const kestrel = merged.hulls?.find((hull) => hull.id === "PLAYER_SHIP_HARD");
    assert.equal(kestrel?.img, "kestral");
    assert.equal(kestrel?.layout, "kestral");
    assert.deepEqual(kestrel?.picture, MOUNT_IMAGES.kestral);
    assert.deepEqual(kestrel?.mounts, WEAPON_MOUNTS.kestral);
    assert.deepEqual(kestrel?.cloakOffset, { x: 0, y: 0 });
    assert.deepEqual(kestrel?.floorOffset, { x: 0, y: 0 });
    assert.ok((kestrel?.gibs?.length ?? 0) >= 1);
    const mounts = Object.values(WEAPON_MOUNTS).reduce((count, rows) => count + rows.length, 0);
    assert.equal(Object.keys(WEAPON_MOUNTS).length, 69);
    assert.equal(mounts, 325);
    const fighter = merged.hulls?.find((hull) => hull.id === "REBEL_SKINNY");
    assert.equal(fighter?.layout, "rebel-fighter");
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

import {
  standInAchievementsXml,
  standInEventFiles,
  standInSectorsXml,
  standInShipsXml,
} from "@stl/campaign";
import { hullPictureFiles, standInSheet, type HullPictureFile } from "@stl/catalog/src/ship-art.ts";
import { layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { mountsFor } from "@stl/catalog/src/weapon-mounts.ts";
import { packFtlDat } from "@stl/ftldat";
import { standInMedia } from "./media.ts";
import { TEXT_LISTS_XML } from "./text-lists.ts";
import { basePng, cloakPng, floorPng, gibPng, shieldPng } from "./png.ts";

/** The stand-in archive: the campaign document, layouts, drawings, and original pictures. */
export async function standInDat(): Promise<Uint8Array> {
  const pictures = hullPictureFiles();
  const media = await standInMedia();
  return packFtlDat(
    [
      ...standInEventFiles(),
      { path: "data/blueprints.xml", xml: standInShipsXml() },
      { path: "data/sector_data.xml", xml: standInSectorsXml() },
      { path: "data/achievements.xml", xml: standInAchievementsXml() },
      { path: "data/text_lists.xml", xml: TEXT_LISTS_XML },
      ...pictures.map((file) => ({ path: file.path, xml: file.xml })),
      ...media.documents,
    ],
    layoutFiles(),
    [...standInImages(pictures), ...media.assets],
  );
}

/** Base, cloak, floor, shield, and gib pngs for each drawing. Names match a real archive. */
export function standInImages(
  files: readonly HullPictureFile[],
): { path: string; bytes: Uint8Array }[] {
  const images: { path: string; bytes: Uint8Array }[] = [];
  for (const file of files) {
    const gibs = standInSheet(file.picture, mountsFor(file.stem)).gibs ?? [];
    images.push(
      {
        path: `img/ship/${file.stem}_base.png`,
        bytes: basePng(file.stem, file.picture, file.rooms),
      },
      {
        path: `img/ship/${file.stem}_cloak.png`,
        bytes: cloakPng(file.stem, file.picture, file.rooms),
      },
      {
        path: `img/ship/${file.stem}_floor.png`,
        bytes: floorPng(file.stem, file.picture, file.rooms),
      },
      {
        path: `img/ship/${file.stem}_shields1.png`,
        bytes: shieldPng(file.stem, file.picture, file.rooms),
      },
      {
        path: `img/ships_noglow/${file.stem}_base.png`,
        bytes: basePng(file.stem, file.picture, file.rooms),
      },
      {
        path: `img/ships_glow/${file.stem}_base.png`,
        bytes: cloakPng(file.stem, file.picture, file.rooms),
      },
      ...gibs.map((gib, index) => ({
        path: `img/ship/${file.stem}_gib${gib.id}.png`,
        bytes: gibPng(file.stem, file.picture, file.rooms, index, gibs.length),
      })),
    );
  }
  return images;
}

export { standInAchievementsXml, standInEventFiles, standInSectorsXml, standInShipsXml };

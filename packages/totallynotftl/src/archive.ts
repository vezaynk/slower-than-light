import {
  standInAchievementsXml,
  standInEventFiles,
  standInSectorsXml,
  standInShipsXml,
} from "@stl/campaign";
import {
  hullLayers,
  hullPictureFiles,
  standInSheet,
  type HullPictureFile,
} from "@stl/catalog/src/ship-art.ts";
import { LAYOUT_FILE, layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { mountsFor } from "@stl/catalog/src/weapon-mounts.ts";
import { packFtlDat } from "@stl/ftldat";
import { pictureForRooms, type HullPicture } from "@stl/pack";
import { standInMedia } from "./media.ts";
import { TEXT_LISTS_XML } from "./text-lists.ts";
import {
  basePng,
  cloakPng,
  floorPng,
  gibPng,
  glowPortraitPng,
  localeMenuPng,
  shieldPng,
} from "./png.ts";

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
      { path: "data/text-eo.xml", xml: TEXT_EO_XML },
      ...pictures.map((file) => ({ path: file.path, xml: file.xml })),
      ...media.documents,
    ],
    layoutFiles(),
    [...standInImages(pictures), ...media.assets],
  );
}

/**
 * The bitmap stays on the room grid. The `<img>` box can be the measured archive
 * rectangle, which is not a whole number of rooms, and that box does not move the gibs.
 */
function drawBox(file: HullPictureFile): HullPicture {
  return pictureForRooms(file.rooms) ?? file.picture;
}

/** Player layout stems. Their combat plate stays in `img/ship`, as a real archive stores it. */
const PLAYER_STEM = new Set(Object.values(LAYOUT_FILE));

/**
 * Pictures for each drawing, at the paths ftl.dat uses. Per the user: the stand-in mirrors that layout, read or not.
 * - Player: plate and gibs in `img/ship`, and `img/customizeUI/miniship_<stem>.png` for the ship picker.
 * - Enemy: plate and gibs in both `img/ships_glow` (drawn in combat) and `img/ships_noglow`.
 * - Cloak, floor, and shield sit in `img/ship`, only under the stem that owns them (hullLayers).
 */
export function standInImages(
  files: readonly HullPictureFile[],
): { path: string; bytes: Uint8Array }[] {
  const images: { path: string; bytes: Uint8Array }[] = [];
  for (const file of files) {
    const box = drawBox(file);
    const gibs = standInSheet(box, mountsFor(file.stem), file.stem).gibs ?? [];
    const pieces = gibs.map((gib, index) => ({
      id: gib.id,
      bytes: gibPng(file.stem, box, file.rooms, index, gibs.length),
    }));
    const gibFiles = (folder: string) =>
      pieces.map((piece) => ({
        path: `img/${folder}/${file.stem}_gib${piece.id}.png`,
        bytes: piece.bytes,
      }));
    const layers = hullLayers(file.stem);
    if (layers.cloak === file.stem)
      images.push({
        path: `img/ship/${file.stem}_cloak.png`,
        bytes: cloakPng(file.stem, box, file.rooms),
      });
    if (layers.floor === file.stem)
      images.push({
        path: `img/ship/${file.stem}_floor.png`,
        bytes: floorPng(file.stem, box, file.rooms),
      });
    if (layers.shield === file.stem)
      images.push({
        path: `img/ship/${file.stem}_shields1.png`,
        bytes: shieldPng(file.stem, box, file.rooms),
      });
    if (PLAYER_STEM.has(file.stem)) {
      images.push(
        { path: `img/ship/${file.stem}_base.png`, bytes: basePng(file.stem, box, file.rooms) },
        ...gibFiles("ship"),
        {
          path: `img/customizeUI/miniship_${file.stem}.png`,
          bytes: glowPortraitPng(file.stem, box, file.rooms),
        },
      );
      continue;
    }
    images.push(
      {
        path: `img/ships_glow/${file.stem}_base.png`,
        bytes: glowPortraitPng(file.stem, box, file.rooms),
      },
      ...gibFiles("ships_glow"),
      {
        path: `img/ships_noglow/${file.stem}_base.png`,
        bytes: basePng(file.stem, box, file.rooms),
      },
      ...gibFiles("ships_noglow"),
    );
  }
  images.push({ path: "img/loc-eo/statusUI/menu.png", bytes: localeMenuPng() });
  return images;
}

/** Original Esperanto table. English stays the default. The code is the filename, unnormalized. */
const TEXT_EO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="language_name">Esperanto</text>
  <text name="menu_title">Malrapida ol lumo</text>
</FTL>
`;

export { standInAchievementsXml, standInEventFiles, standInSectorsXml, standInShipsXml };

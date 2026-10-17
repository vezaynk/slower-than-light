import { standInXml } from "@stl/campaign";
import { hullPictureFiles } from "@stl/catalog/src/ship-art.ts";
import { layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { packFtlDat } from "@stl/ftldat";
import { basePng } from "./png.ts";

/** The stand-in archive: the campaign document, one layout file, and one base picture per ship. */
export async function standInDat(): Promise<Uint8Array> {
  const pictures = hullPictureFiles();
  return packFtlDat(
    [
      { path: "data/stand-in.xml", xml: standInXml() },
      ...pictures.map((file) => ({ path: file.path, xml: file.xml })),
    ],
    layoutFiles(),
    pictures.map((file) => ({
      path: `img/ship/${file.stem}_base.png`,
      bytes: basePng(file.stem, file.picture, file.rooms),
    })),
  );
}

export { standInXml };

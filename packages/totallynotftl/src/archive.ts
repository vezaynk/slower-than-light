import { standInXml } from "@stl/campaign";
import { layoutFiles } from "@stl/catalog/src/ship-layouts.ts";
import { packFtlDat } from "@stl/ftldat";

/** The stand-in archive: the campaign document and one layout file per player ship. */
export async function standInDat(): Promise<Uint8Array> {
  return packFtlDat([{ path: "data/stand-in.xml", xml: standInXml() }], layoutFiles());
}

export { standInXml };

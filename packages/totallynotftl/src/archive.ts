import { standInXml } from "@stl/campaign";
import { packFtlDat } from "@stl/ftldat";

/** The stand-in archive: one campaign document, no generated art or sounds yet. */
export async function standInDat(): Promise<Uint8Array> {
  return packFtlDat([{ path: "data/stand-in.xml", xml: standInXml() }]);
}

export { standInXml };

import { packFtlDat } from "@stl/ftldat";
import { standInXml } from "./document.ts";

/** The stand-in archive: one XML document, no generated art or sounds yet. */
export async function standInDat(): Promise<Uint8Array> {
  return packFtlDat([{ path: "data/stand-in.xml", xml: await standInXml() }]);
}

export { standInXml };

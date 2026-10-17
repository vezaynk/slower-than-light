import { standInXml } from "@stl/campaign";
import { packFtlDat } from "@stl/ftldat";
import { emitMod } from "@stl/hyperspace";
import { parsePack } from "@stl/pack";

/** The stand-in archive: one campaign document, no generated art or sounds yet. */
export async function standInDat(): Promise<Uint8Array> {
  return packFtlDat([{ path: "data/stand-in.xml", xml: standInXml() }]);
}

/** The stand-in pack written as one Hyperspace document. */
export async function standInMod(): Promise<string> {
  return emitMod(parsePack(standInXml()));
}

export { standInXml };

import { emitMod } from "@stl/hyperspace";
import { packFtlDat } from "@stl/ftldat";
import { packFromFtl } from "@stl/pack";
import { standInXml } from "./document.ts";

/** The stand-in archive: one XML document, no generated art or sounds yet. */
export async function standInDat(): Promise<Uint8Array> {
  return packFtlDat([{ path: "data/stand-in.xml", xml: await standInXml() }]);
}

/** The stand-in pack written as the mod file the game loads beside base.xml. */
export async function standInMod(): Promise<string> {
  const xml = await standInXml();
  return emitMod(packFromFtl([{ path: "data/stand-in.xml", xml }]));
}

export { standInXml };

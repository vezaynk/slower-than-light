import { extractArchive, type FtlExtract } from "@stl/ftldat";
import { applyFtlMod, packFromExtract } from "@stl/hyperspace";
import { loadPack } from "@stl/pack";

/** Applies one gap archive over an unpacked base and installs that pack. */
export function loadExtractedPack(archive: FtlExtract, gap: FtlExtract): FtlExtract {
  const files = applyFtlMod(archive, gap);
  loadPack(packFromExtract(files), "base");
  return files;
}

/** Unpacks one archive and a gap archive, then installs that pack. */
export async function loadArchivePack(archive: Uint8Array, gap: Uint8Array): Promise<FtlExtract> {
  return loadExtractedPack(await extractArchive(archive), await extractArchive(gap));
}

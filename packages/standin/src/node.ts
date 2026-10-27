import { readFileSync } from "node:fs";
import { extractArchive } from "@stl/ftldat";
import { applyFtlMod, packFromExtract } from "@stl/hyperspace";
import { loadPack } from "@stl/pack";

/** Installs the committed stand-in and the campaign gap. A later call puts that pack back. */
export async function installStandIn(): Promise<void> {
  const dat = readFileSync(new URL(import.meta.resolve("@stl/totallynotftl/totallynotftl.dat")));
  const gap = readFileSync(new URL(import.meta.resolve("@stl/campaign/base.ftl")));
  const files = applyFtlMod(await extractArchive(dat), await extractArchive(gap));
  loadPack(packFromExtract(files), "base");
}

await installStandIn();

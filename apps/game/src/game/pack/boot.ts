import packUrl from "../../../../../packages/campaign/base.xml?url";
import { extractFtlDat } from "@stl/ftldat";
import { fetchPackXml, joinFtlPack, loadPack, packFromFtl, parsePack } from "@stl/pack";

type Listen = (ratio: number) => void;

const listeners = new Set<Listen>();
let generation = 0;

function report(ratio: number) {
  for (const listen of listeners) listen(ratio);
}

/**
 * Unpacks the player's ftl.dat as the base pack, then joins the rules document.
 * The rules document holds crew combat stats, the store shelf, hulls, sectors, and events.
 * A later pick replaces an earlier one that is still unpacking.
 */
export function loadFtlDat(file: Blob, onProgress: Listen): Promise<void> {
  const mine = ++generation;
  listeners.add(onProgress);
  onProgress(0);
  return run(file, mine).finally(() => {
    listeners.delete(onProgress);
  });
}

async function run(file: Blob, mine: number): Promise<void> {
  report(0.05);
  const extracted = await extractFtlDat(file);
  if (mine !== generation) return;
  report(0.7);
  const archive = packFromFtl(extracted.documents);
  const xml = await fetchPackXml(packUrl, (ratio) => {
    if (mine === generation) report(0.7 + ratio * 0.2);
  });
  if (mine !== generation) return;
  report(0.95);
  loadPack(joinFtlPack(archive, parsePack(xml)), "base");
  report(1);
}

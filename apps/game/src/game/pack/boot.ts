import datUrl from "../../../../../packages/totallynotftl/totallynotftl.dat?url";
import packUrl from "../../../../../packages/campaign/base.xml?url";
import { extractFtlDat } from "@stl/ftldat";
import { packFromExtract } from "@stl/hyperspace";
import { fetchPackXml, loadPack, overlayGap, parsePack } from "@stl/pack";

type Listen = (ratio: number) => void;

const listeners = new Set<Listen>();
let latest = 0;
let job: Promise<void> | null = null;

function report(ratio: number) {
  latest = ratio;
  for (const listen of listeners) listen(ratio);
}

async function fetchBytes(url: string, onProgress: (ratio: number) => void): Promise<Uint8Array> {
  onProgress(0);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`pack ${res.status}`);
  const body = res.body;
  if (!body) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    onProgress(1);
    return bytes;
  }
  const total = Number(res.headers.get("content-length"));
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total > 0) onProgress(Math.min(1, received / total));
  }
  onProgress(1);
  const all = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return all;
}

async function install(source?: ArrayBuffer | Uint8Array): Promise<void> {
  const bytes = source
    ? source instanceof Uint8Array
      ? source
      : new Uint8Array(source)
    : await fetchBytes(datUrl, (ratio) => report(ratio * 0.45));
  if (source) report(0.45);
  const xml = await fetchPackXml(packUrl, (ratio) => report(0.45 + ratio * 0.45));
  report(0.95);
  const files = await extractFtlDat(bytes);
  loadPack(overlayGap(packFromExtract(files), parsePack(xml)), "base");
  report(1);
}

/** Fetches the bundled archive and the gap file, and installs that pack. Later callers share the same load. */
export function loadBasePackXml(onProgress: Listen): Promise<void> {
  listeners.add(onProgress);
  onProgress(latest);
  job ??= install().catch((err: unknown) => {
    job = null;
    throw err;
  });
  return job.finally(() => {
    listeners.delete(onProgress);
  });
}

/**
 * Installs one archive, then the gap file.
 * A passed-in buffer is the player's ftl.dat. This load does not reuse the bundled one.
 */
export function loadArchiveThenCampaign(
  source: ArrayBuffer | Uint8Array,
  onProgress: Listen,
): Promise<void> {
  listeners.add(onProgress);
  onProgress(latest);
  return install(source).finally(() => {
    listeners.delete(onProgress);
  });
}

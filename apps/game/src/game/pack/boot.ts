import datUrl from "../../../../../packages/totallynotftl/totallynotftl.dat?url";
import gapUrl from "../../../../../packages/campaign/base.ftl?url";
import { extractArchive } from "@stl/ftldat";
import { applyFtlMod, packFromExtract } from "@stl/hyperspace";
import { loadPack } from "@stl/pack";
import { rememberArchive } from "./media";
import { rememberShipArt } from "./ship-art";

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

/**
 * The archive to boot from: `?dat=<url>` names one (a player's ftl.dat or a `.ftl` zip on a local server, for example),
 * otherwise the bundled stand-in. The URL is fetched like any other, so a server on another origin must allow it (CORS).
 */
function archiveUrl(): string {
  if (typeof location === "undefined") return datUrl;
  const named = new URLSearchParams(location.search).get("dat")?.trim();
  return named || datUrl;
}

async function install(source?: ArrayBuffer | Uint8Array): Promise<void> {
  const bytes = source
    ? source instanceof Uint8Array
      ? source
      : new Uint8Array(source)
    : await fetchBytes(archiveUrl(), (ratio) => report(ratio * 0.4));
  if (source) report(0.4);
  const gapBytes = await fetchBytes(gapUrl, (ratio) => report(0.4 + ratio * 0.4));
  report(0.85);
  const archive = await extractArchive(bytes);
  const gap = await extractArchive(gapBytes);
  const files = applyFtlMod(archive, gap);
  rememberShipArt(files.assets);
  await rememberArchive(files.documents, files.assets);
  loadPack(packFromExtract(files), "base");
  report(1);
}

/** Fetches the bundled archive and the gap mod, and installs that pack. Later callers share the same load. */
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
 * Installs one archive, then the gap mod.
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

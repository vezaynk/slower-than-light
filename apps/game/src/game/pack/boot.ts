import datUrl from "../../../../../packages/totallynotftl/totallynotftl.dat?url";
import gapUrl from "../../../../../packages/campaign/base.ftl?url";
import { extractArchive, type FtlExtract } from "@stl/ftldat";
import { applyFtlMod, packFromExtract } from "@stl/hyperspace";
import { loadPack, warnPack } from "@stl/pack";
import { STAND_IN_ID, fileBlob, loadOrder, orderKey } from "./archive-list";
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

export async function fetchBytes(
  url: string,
  onProgress: (ratio: number) => void,
): Promise<Uint8Array> {
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
 * `?dat=<url>` names one archive to boot from (a player's ftl.dat or a `.ftl` zip on a local server, for example).
 * It overrides the Game files order. The URL is fetched like any other, so a server on another origin must allow it (CORS).
 */
export function urlArchive(): string | undefined {
  if (typeof location === "undefined") return undefined;
  return new URLSearchParams(location.search).get("dat")?.trim() || undefined;
}

/** What the running pack was built from: the Game files order key, or "url". Undefined before boot finishes. */
let booted: string | undefined;
/** Files the last boot skipped, with the reason. */
const skipped: { name: string; reason: string }[] = [];

export function bootedOrderKey(): string | undefined {
  return booted;
}

export function bootSkipped(): readonly { name: string; reason: string }[] {
  return skipped;
}

/** A file that does not read is skipped with a warning, so one bad upload cannot stop the game from starting. */
async function readArchive(name: string, bytes: Uint8Array): Promise<FtlExtract | undefined> {
  try {
    return await extractArchive(bytes);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    skipped.push({ name, reason });
    warnPack(`${name} is not an ftl.dat or .ftl/.zip archive (${reason}); it is skipped.`);
    return undefined;
  }
}

/** The Game files order: the first enabled file is the base, each later one is applied over it. */
async function orderedArchive(onProgress: (ratio: number) => void): Promise<FtlExtract> {
  const order = await loadOrder();
  const enabled = order.filter((row) => row.enabled);
  booted = orderKey(order);
  let files: FtlExtract | undefined;
  for (const [at, row] of enabled.entries()) {
    const part = (ratio: number) => onProgress((at + ratio) / enabled.length);
    let bytes: Uint8Array | undefined;
    if (row.id === STAND_IN_ID) bytes = await fetchBytes(datUrl, part);
    else {
      const blob = await fileBlob(row.id).catch(() => undefined);
      if (blob) bytes = new Uint8Array(await blob.arrayBuffer());
      else {
        skipped.push({ name: row.name, reason: "the browser no longer has this file" });
        warnPack(`${row.name} is no longer stored in this browser; it is skipped.`);
      }
      part(1);
    }
    if (!bytes) continue;
    const read = await readArchive(row.name, bytes);
    if (!read) continue;
    if (!files) {
      files = read;
      continue;
    }
    try {
      files = applyFtlMod(files, read);
    } catch (err) {
      // A patch that does not apply leaves the archive as it was, so the game still starts.
      const reason = err instanceof Error ? err.message : String(err);
      skipped.push({ name: row.name, reason });
      warnPack(`${row.name} could not be applied (${reason}); it is skipped.`);
    }
  }
  if (files) return files;
  // Nothing enabled, or nothing read: the stand-in, so the title screen still opens.
  if (enabled.length > 0) warnPack("No game file could be read; the stand-in archive is used.");
  return extractArchive(await fetchBytes(datUrl, onProgress));
}

async function install(source?: ArrayBuffer | Uint8Array): Promise<void> {
  skipped.length = 0;
  const named = urlArchive();
  let archive: FtlExtract;
  if (source) {
    archive = await extractArchive(source instanceof Uint8Array ? source : new Uint8Array(source));
    report(0.4);
  } else if (named) {
    booted = "url";
    archive = await extractArchive(await fetchBytes(named, (ratio) => report(ratio * 0.4)));
  } else {
    archive = await orderedArchive((ratio) => report(ratio * 0.4));
  }
  const gapBytes = await fetchBytes(gapUrl, (ratio) => report(0.4 + ratio * 0.4));
  report(0.85);
  const gap = await extractArchive(gapBytes);
  const files = applyFtlMod(archive, gap);
  await rememberShipArt(files.assets);
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

/** The bundled stand-in and campaign rules, for the Game files inspector (pack/archive-reader.ts). */
export const STAND_IN_URL = datUrl;
export const CAMPAIGN_URL = gapUrl;

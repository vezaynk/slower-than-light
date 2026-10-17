import { AsyncUnzipInflate, Unzip, UnzipInflate, type UnzipFile } from "fflate";
import { collectExtract, sourceBytes, type FtlDatSource, type FtlExtract } from "./extract.ts";

const RESOURCE_ROOTS = new Set(["data", "img", "audio", "fonts", "mod-appendix"]);

type ZipSlot = { path: string; chunks: Uint8Array[]; bytes?: Uint8Array };

/**
 * Reads one Slipstream `.ftl` zip into the same path map as `extractFtlDat`.
 * Deflate uses fflate's async inflater when a worker exists, so a large file
 * does not block the page. Files are recorded in local-header order.
 * `unzip()` inserts each file when it finishes, so a large file can land after
 * a later small one and change which record wins.
 * The stream does not look for an end-of-central-directory record. A buffer
 * without one is rejected, matching `unzipSync`.
 * A single wrapper folder is removed when the archive root is not already
 * `data/`, `img/`, `audio/`, or `fonts/`.
 * `mod-appendix/` is Slipstream's description and is not a resource path.
 */
export async function extractFtlZip(source: FtlDatSource): Promise<FtlExtract> {
  const bytes = await sourceBytes(source);
  const entries = await readZip(bytes);
  return collectExtract(resourceFiles(entries));
}

function readZip(bytes: Uint8Array): Promise<{ path: string; bytes: Uint8Array }[]> {
  return new Promise((resolve, reject) => {
    if (!hasEndOfCentralDirectory(bytes)) {
      reject(new Error("Mod zip is not readable: invalid zip data"));
      return;
    }
    const slots: ZipSlot[] = [];
    const stoppers: Array<() => void> = [];
    let pending = 0;
    let pushed = false;
    let failed = false;

    const fail = (err: unknown) => {
      if (failed) return;
      failed = true;
      for (const stop of stoppers) stop();
      const detail = err instanceof Error ? err.message : String(err);
      reject(new Error(`Mod zip is not readable: ${detail}`));
    };

    const finish = () => {
      if (failed || !pushed || pending !== 0) return;
      resolve(slots.map((slot) => ({ path: slot.path, bytes: slot.bytes ?? new Uint8Array() })));
    };

    const archive = new Unzip();
    // AsyncUnzipInflate starts a Worker at 320KB uncompressed. Node has no Worker.
    archive.register(typeof Worker === "undefined" ? UnzipInflate : AsyncUnzipInflate);
    archive.onfile = (file) =>
      collectFile(
        file,
        slots,
        stoppers,
        fail,
        () => {
          pending += 1;
        },
        () => {
          pending -= 1;
          finish();
        },
      );

    try {
      archive.push(bytes, true);
    } catch (err) {
      fail(err);
      return;
    }
    pushed = true;
    finish();
  });
}

function collectFile(
  file: UnzipFile,
  slots: ZipSlot[],
  stoppers: Array<() => void>,
  fail: (err: unknown) => void,
  begin: () => void,
  end: () => void,
) {
  const slot: ZipSlot = { path: file.name, chunks: [] };
  slots.push(slot);
  begin();
  stoppers.push(() => file.terminate?.());
  file.ondata = (err, chunk, final) => {
    if (err) {
      fail(err);
      return;
    }
    if (chunk?.byteLength) slot.chunks.push(chunk);
    if (!final || slot.bytes) return;
    slot.bytes = joinChunks(slot.chunks);
    file.terminate?.();
    end();
  };
  try {
    file.start();
  } catch (err) {
    fail(err);
  }
}

/** PK\x05\x06 within the last 65558 bytes. Same window as fflate's `unzipSync`. */
function hasEndOfCentralDirectory(bytes: Uint8Array): boolean {
  const start = bytes.length - 22;
  if (start < 0) return false;
  const stop = Math.max(0, bytes.length - 65558);
  for (let i = start; i >= stop; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return true;
    }
  }
  return false;
}

function joinChunks(chunks: Uint8Array[]): Uint8Array {
  const first = chunks[0];
  if (!first) return new Uint8Array();
  if (chunks.length === 1) return first;
  let size = 0;
  for (const chunk of chunks) size += chunk.byteLength;
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function resourceFiles(
  entries: { path: string; bytes: Uint8Array }[],
): { path: string; bytes: Uint8Array }[] {
  const files: { path: string; bytes: Uint8Array }[] = [];
  for (const entry of entries) {
    const path = entry.path.replaceAll("\\", "/").replace(/^\/+/, "");
    if (!path || path.endsWith("/")) continue;
    const parts = path.split("/");
    if (parts.includes("__MACOSX") || parts.at(-1) === ".DS_Store") continue;
    files.push({ path, bytes: entry.bytes });
  }
  return dropAppendix(stripWrapper(files));
}

function stripWrapper(
  files: { path: string; bytes: Uint8Array }[],
): { path: string; bytes: Uint8Array }[] {
  if (files.length === 0) return files;
  const tops = new Set(files.map((file) => file.path.split("/")[0] ?? ""));
  for (const top of tops) {
    if (RESOURCE_ROOTS.has(top)) return files;
  }
  if (tops.size !== 1) return files;
  const prefix = `${[...tops][0]}/`;
  if (!files.every((file) => file.path.startsWith(prefix))) return files;
  return files
    .map((file) => ({ path: file.path.slice(prefix.length), bytes: file.bytes }))
    .filter((file) => file.path.length > 0);
}

function dropAppendix(
  files: { path: string; bytes: Uint8Array }[],
): { path: string; bytes: Uint8Array }[] {
  return files.filter(
    (file) => file.path !== "mod-appendix" && !file.path.startsWith("mod-appendix/"),
  );
}

import { unzipSync } from "fflate";
import { collectExtract, sourceBytes, type FtlDatSource, type FtlExtract } from "./extract.ts";

const RESOURCE_ROOTS = new Set(["data", "img", "audio", "fonts", "mod-appendix"]);

/**
 * Reads one Slipstream `.ftl` zip into the same path map as `extractFtlDat`.
 * Paths stay in zip order. A single wrapper folder is removed when the archive
 * root is not already `data/`, `img/`, `audio/`, or `fonts/`.
 * `mod-appendix/` is Slipstream's description and is not a resource path.
 */
export async function extractFtlZip(source: FtlDatSource): Promise<FtlExtract> {
  const bytes = await sourceBytes(source);
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Mod zip is not readable: ${detail}`);
  }
  return collectExtract(resourceFiles(entries));
}

function resourceFiles(entries: Record<string, Uint8Array>): { path: string; bytes: Uint8Array }[] {
  const files: { path: string; bytes: Uint8Array }[] = [];
  for (const [raw, bytes] of Object.entries(entries)) {
    const path = raw.replaceAll("\\", "/").replace(/^\/+/, "");
    if (!path || path.endsWith("/")) continue;
    const parts = path.split("/");
    if (parts.includes("__MACOSX") || parts.at(-1) === ".DS_Store") continue;
    files.push({ path, bytes });
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

/** The message shapes between the Game files reader and its worker, and the combine both of them run. */
import type { FtlExtract } from "@stl/ftldat";
import { applyFtlMod } from "@stl/hyperspace";
import type { ArchiveSummary } from "./archive-inspect";

export type ReaderRequest =
  | { op: "open"; seq: number; id: string; blob: Blob }
  | { op: "combine"; seq: number; ids: string[] }
  | { op: "forget"; id: string };

export type ReaderReply =
  | { op: "open"; seq: number; files: FtlExtract; summary: ArchiveSummary }
  | { op: "combine"; seq: number; summary: ArchiveSummary; skipped: string[] }
  | { op: "error"; seq: number; reason: string };

/**
 * Applies each archive over the first one, as boot does. One that did not read, or whose patch does not apply,
 * is left out and named in `skipped`.
 */
export function combine(entries: readonly { id: string; files: FtlExtract | undefined }[]): {
  files: FtlExtract;
  skipped: string[];
} {
  let files: FtlExtract | undefined;
  const skipped: string[] = [];
  for (const entry of entries) {
    if (!entry.files) {
      skipped.push(entry.id);
      continue;
    }
    if (!files) {
      files = entry.files;
      continue;
    }
    try {
      files = applyFtlMod(files, entry.files);
    } catch {
      skipped.push(entry.id);
    }
  }
  if (!files) throw new Error("None of these files could be read.");
  return { files, skipped };
}

/**
 * The Game files inspector's reader: opens an entry (the stand-in, a stored player file, or the campaign rules) and
 * returns its files and summary. The work runs in archive-worker.ts; without workers it runs here.
 */
import { extractArchive, type FtlExtract } from "@stl/ftldat";
import { summarize, type ArchiveSummary } from "./archive-inspect";
import { combine, type ReaderReply, type ReaderRequest } from "./archive-combine";
import { STAND_IN_ID, fileBlob } from "./archive-list";
import { CAMPAIGN_URL, STAND_IN_URL } from "./boot";

/** The campaign rules (base.ftl), shown pinned last in Game files. */
export const CAMPAIGN_ID = "builtin:campaign";

export type { ReaderReply, ReaderRequest } from "./archive-combine";

export type OpenedEntry = { files: FtlExtract; summary: ArchiveSummary };

let worker: Worker | null | undefined;
let seq = 0;
const waiting = new Map<number, (reply: ReaderReply) => void>();
const opened = new Map<string, Promise<OpenedEntry>>();
/** Without a worker, archives opened here, for combine. */
const local = new Map<string, FtlExtract>();

function readerWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker =
      typeof Worker === "undefined"
        ? null
        : new Worker(new URL("./archive-worker.ts", import.meta.url), { type: "module" });
  } catch {
    worker = null;
  }
  if (worker) {
    worker.onmessage = (e: MessageEvent<ReaderReply>) => {
      const done = waiting.get(e.data.seq);
      waiting.delete(e.data.seq);
      done?.(e.data);
    };
    // A crashed worker (out of memory on a large dat, for example) answers every pending read with an error,
    // so the panel does not wait forever. The next read starts a new worker.
    worker.onerror = (e) => {
      e.preventDefault();
      const reason = "The file reader stopped. The file may be too large for this device.";
      for (const [at, done] of waiting) done({ op: "error", seq: at, reason });
      waiting.clear();
      opened.clear();
      worker?.terminate();
      worker = undefined;
    };
  }
  return worker;
}

function ask(req: Exclude<ReaderRequest, { op: "forget" }>): Promise<ReaderReply> {
  const w = readerWorker()!;
  return new Promise((resolve) => {
    waiting.set(req.seq, resolve);
    w.postMessage(req);
  });
}

async function entryBlob(id: string): Promise<Blob> {
  if (id === STAND_IN_ID || id === CAMPAIGN_ID) {
    const res = await fetch(id === STAND_IN_ID ? STAND_IN_URL : CAMPAIGN_URL);
    if (!res.ok) throw new Error(`The built-in file did not load (${res.status}).`);
    return res.blob();
  }
  const blob = await fileBlob(id);
  if (!blob) throw new Error("The browser no longer has this file.");
  return blob;
}

/** One entry's files and summary. Cached per id, so a 270 MB dat is read once per visit. */
export function openEntry(id: string): Promise<OpenedEntry> {
  let hit = opened.get(id);
  if (hit) return hit;
  hit = (async () => {
    const blob = await entryBlob(id);
    if (readerWorker()) {
      const reply = await ask({ op: "open", seq: ++seq, id, blob });
      if (reply.op === "error") throw new Error(reply.reason);
      if (reply.op !== "open") throw new Error("The file reader answered out of turn.");
      return { files: reply.files, summary: reply.summary };
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const files = await extractArchive(bytes);
    local.set(id, files);
    return { files, summary: summarize(files, bytes.slice(0, 16)) };
  })();
  hit.catch(() => opened.delete(id));
  opened.set(id, hit);
  return hit;
}

export function forgetEntry(id: string): void {
  opened.delete(id);
  local.delete(id);
  readerWorker()?.postMessage({ op: "forget", id } satisfies ReaderRequest);
}

/** What the game would have from these entries, in order, with the campaign rules last, and what it left out. */
export async function combineEntries(
  ids: readonly string[],
): Promise<{ summary: ArchiveSummary; skipped: string[] }> {
  const all = [...ids, CAMPAIGN_ID];
  // Every entry is opened first, so the worker holds it. One that does not read is left out, as boot leaves it out.
  await Promise.all(all.map((id) => openEntry(id).catch(() => undefined)));
  if (readerWorker()) {
    const reply = await ask({ op: "combine", seq: ++seq, ids: all });
    if (reply.op === "error") throw new Error(reply.reason);
    if (reply.op !== "combine") throw new Error("The file reader answered out of turn.");
    return { summary: reply.summary, skipped: reply.skipped };
  }
  const { files, skipped } = combine(all.map((id) => ({ id, files: local.get(id) })));
  return { summary: summarize(files), skipped };
}

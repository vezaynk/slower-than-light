/**
 * Reads and summarises Game files off the main thread. A 270 MB ftl.dat takes seconds to unpack and read, and the
 * Options screen has to stay responsive meanwhile. Each opened archive is kept here by id, so "Check" can combine
 * them without sending them back.
 */
import { extractArchive, type FtlExtract } from "@stl/ftldat";
import { summarize } from "./archive-inspect";
import { combine, type ReaderReply, type ReaderRequest } from "./archive-combine";

const kept = new Map<string, FtlExtract>();

function reply(message: ReaderReply) {
  (self as unknown as Worker).postMessage(message);
}

function reason(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

self.onmessage = async (e: MessageEvent<ReaderRequest>) => {
  const req = e.data;
  if (req.op === "forget") {
    kept.delete(req.id);
    return;
  }
  if (req.op === "open") {
    try {
      const bytes = new Uint8Array(await req.blob.arrayBuffer());
      const files = await extractArchive(bytes);
      kept.set(req.id, files);
      reply({ op: "open", seq: req.seq, files, summary: summarize(files, bytes.slice(0, 16)) });
    } catch (err) {
      reply({ op: "error", seq: req.seq, reason: reason(err) });
    }
    return;
  }
  try {
    const { files, skipped } = combine(req.ids.map((id) => ({ id, files: kept.get(id) })));
    reply({ op: "combine", seq: req.seq, summary: summarize(files), skipped });
  } catch (err) {
    reply({ op: "error", seq: req.seq, reason: reason(err) });
  }
};

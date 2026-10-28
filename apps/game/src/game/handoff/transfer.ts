/**
 * Send and receive one handoff on an open data channel. The receiver checks each piece as it arrives
 * and only then returns the bytes. Saving them is a separate step, so a closed connection writes nothing.
 */

import {
  decodeFrame,
  encodeApplied,
  encodeDone,
  encodeError,
  encodeManifest,
  encodeChunk,
  type Frame,
} from "./frame.ts";
import {
  CHUNK_BYTES,
  digestHex,
  freshDigest,
  handoffByteCount,
  mixDigest,
  recordName,
  type HandoffBytes,
  type HandoffManifest,
} from "./payload.ts";

const HIGH_WATER = 1024 * 1024;

const armed = new WeakMap<
  RTCDataChannel,
  { queue: MessageEvent[]; capture: (ev: MessageEvent) => void }
>();

/** Keep messages that arrive before the page is ready to read them. */
export function armChannel(dc: RTCDataChannel): void {
  if (armed.has(dc)) return;
  dc.binaryType = "arraybuffer";
  const queue: MessageEvent[] = [];
  const capture = (ev: MessageEvent) => {
    const slot = armed.get(dc);
    if (slot) slot.queue.push(ev);
  };
  armed.set(dc, { queue, capture });
  dc.addEventListener("message", capture);
}

function takeMessages(dc: RTCDataChannel, handler: (ev: MessageEvent) => void): () => void {
  const slot = armed.get(dc);
  if (slot) {
    armed.delete(dc);
    dc.removeEventListener("message", slot.capture);
  }
  dc.addEventListener("message", handler);
  if (slot) for (const ev of slot.queue) handler(ev);
  return () => dc.removeEventListener("message", handler);
}

export function bytesOf(data: unknown): Promise<Uint8Array> | Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof Blob) return data.arrayBuffer().then((buf) => new Uint8Array(buf));
  throw new Error("The connection sent an unexpected message.");
}

export function drainChannel(dc: RTCDataChannel): Promise<void> {
  if (dc.readyState !== "open") return Promise.reject(new Error("The connection closed."));
  if (dc.bufferedAmount < HIGH_WATER) return Promise.resolve();
  dc.bufferedAmountLowThreshold = 256 * 1024;
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      dc.removeEventListener("bufferedamountlow", onLow);
      dc.removeEventListener("close", onClose);
    };
    const onLow = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error("The connection closed."));
    };
    dc.addEventListener("bufferedamountlow", onLow);
    dc.addEventListener("close", onClose);
  });
}

export async function writeHandoff(
  send: (frame: Uint8Array) => Promise<void>,
  manifest: HandoffManifest,
  bytes: HandoffBytes,
  onProgress?: (sent: number, total: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const total = handoffByteCount(manifest);
  let sent = 0;
  const tick = () => onProgress?.(sent, total);
  const stopped = () => {
    if (signal?.aborted) throw new Error("The handoff was cancelled.");
  };
  await send(encodeManifest(manifest));
  tick();
  const step = async (fileIndex: number, blob: Blob) => {
    let offset = 0;
    while (offset < blob.size) {
      stopped();
      const slice = new Uint8Array(await blob.slice(offset, offset + CHUNK_BYTES).arrayBuffer());
      if (!slice.length) break;
      await send(encodeChunk(fileIndex, offset, slice));
      offset += slice.length;
      sent += slice.length;
      tick();
    }
  };
  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i]!;
    if (file.builtin) continue;
    const blob = bytes.files[i];
    if (!blob || blob.size !== file.size)
      throw new Error(`${file.name} is no longer stored in this browser.`);
    await step(i, blob);
  }
  for (let t = 0; t < manifest.texts.length; t++) {
    const row = manifest.texts[t]!;
    const value = bytes.texts[row.key];
    if (value === undefined) throw new Error(`${recordName(row.key)} is missing.`);
    const encoded = new TextEncoder().encode(value);
    if (encoded.length !== row.size)
      throw new Error(`${recordName(row.key)} changed while it was sending.`);
    await step(manifest.files.length + t, new Blob([encoded]));
  }
  stopped();
  await send(encodeDone());
}

export class IncomingHandoff {
  private manifest: HandoffManifest | null = null;
  private fileChunks: Blob[][] = [];
  private fileGot: number[] = [];
  private fileState: Uint8Array[] = [];
  private textChunks: Uint8Array[][] = [];
  private textGot: number[] = [];
  private textState: Uint8Array[] = [];
  private sawDone = false;

  async push(frame: Frame): Promise<boolean> {
    if (this.sawDone) throw new Error("The handoff sent data after it finished.");
    if (frame.kind === "manifest") {
      if (this.manifest) throw new Error("The handoff sent two descriptions.");
      this.manifest = frame.manifest;
      const files = frame.manifest.files.length;
      const texts = frame.manifest.texts.length;
      this.fileChunks = Array.from({ length: files }, () => []);
      this.fileGot = Array(files).fill(0);
      this.textChunks = Array.from({ length: texts }, () => []);
      this.textGot = Array(texts).fill(0);
      this.fileState = await Promise.all(Array.from({ length: files }, () => freshDigest()));
      this.textState = await Promise.all(Array.from({ length: texts }, () => freshDigest()));
      return false;
    }
    if (!this.manifest) throw new Error("The handoff started without a description.");
    if (frame.kind === "chunk") return this.takeChunk(frame.fileIndex, frame.offset, frame.bytes);
    if (frame.kind === "done") {
      this.sawDone = true;
      return true;
    }
    throw new Error("The connection sent an unexpected message.");
  }

  private async takeChunk(fileIndex: number, offset: number, bytes: Uint8Array): Promise<boolean> {
    const manifest = this.manifest!;
    const files = manifest.files.length;
    if (fileIndex < files) {
      const file = manifest.files[fileIndex]!;
      if (file.builtin) throw new Error("The handoff sent bytes for a built-in file.");
      if (offset !== this.fileGot[fileIndex])
        throw new Error(`A piece of ${file.name} arrived out of order.`);
      if (offset + bytes.length > file.size)
        throw new Error(`${file.name} is larger than promised.`);
      this.fileChunks[fileIndex]!.push(new Blob([bytes]));
      this.fileGot[fileIndex] = offset + bytes.length;
      this.fileState[fileIndex] = await mixDigest(this.fileState[fileIndex]!, bytes);
      return false;
    }
    const textIndex = fileIndex - files;
    const text = manifest.texts[textIndex];
    if (!text) throw new Error("The handoff sent an unknown piece.");
    if (offset !== this.textGot[textIndex])
      throw new Error(`A piece of the handoff arrived out of order.`);
    if (offset + bytes.length > text.size)
      throw new Error(`${recordName(text.key)} is larger than promised.`);
    this.textChunks[textIndex]!.push(bytes);
    this.textGot[textIndex] = offset + bytes.length;
    this.textState[textIndex] = await mixDigest(this.textState[textIndex]!, bytes);
    return false;
  }

  async finish(): Promise<{ manifest: HandoffManifest; bytes: HandoffBytes }> {
    if (!this.manifest || !this.sawDone) throw new Error("The handoff is not complete.");
    const manifest = this.manifest;
    const files: (Blob | undefined)[] = [];
    for (let i = 0; i < manifest.files.length; i++) {
      const file = manifest.files[i]!;
      if (file.builtin) {
        files.push(undefined);
        continue;
      }
      if (this.fileGot[i] !== file.size) throw new Error(`${file.name} arrived short.`);
      if (digestHex(this.fileState[i]!) !== manifest.digests[i])
        throw new Error(`${file.name} arrived damaged.`);
      files.push(new Blob(this.fileChunks[i]!));
    }
    const texts: HandoffBytes["texts"] = {};
    for (let t = 0; t < manifest.texts.length; t++) {
      const row = manifest.texts[t]!;
      if (this.textGot[t] !== row.size) throw new Error(`${recordName(row.key)} arrived short.`);
      if (digestHex(this.textState[t]!) !== row.digest)
        throw new Error(`${recordName(row.key)} arrived damaged.`);
      const buf = new Uint8Array(row.size);
      let at = 0;
      for (const part of this.textChunks[t]!) {
        buf.set(part, at);
        at += part.length;
      }
      texts[row.key] = new TextDecoder().decode(buf);
    }
    return { manifest, bytes: { files, texts } };
  }
}

function waitForReply(dc: RTCDataChannel, signal: AbortSignal): Promise<Frame> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      dc.removeEventListener("message", onMessage);
      dc.removeEventListener("close", onClose);
      signal.removeEventListener("abort", onAbort);
    };
    const onMessage = (ev: MessageEvent) => {
      void Promise.resolve(bytesOf(ev.data))
        .then((buf) => {
          const frame = decodeFrame(buf);
          if (frame.kind !== "applied" && frame.kind !== "error") return;
          cleanup();
          resolve(frame);
        })
        .catch((err: unknown) => {
          cleanup();
          reject(err instanceof Error ? err : new Error("The handoff stopped."));
        });
    };
    const onClose = () => {
      cleanup();
      reject(new Error("The connection closed before the other device confirmed."));
    };
    const onAbort = () => {
      cleanup();
      reject(new Error("The handoff was cancelled."));
    };
    takeMessages(dc, onMessage);
    dc.addEventListener("close", onClose);
    signal.addEventListener("abort", onAbort);
    if (signal.aborted) onAbort();
  });
}

export async function sendCollected(
  dc: RTCDataChannel,
  manifest: HandoffManifest,
  bytes: HandoffBytes,
  onProgress: (sent: number, total: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const reply = waitForReply(dc, signal);
  try {
    await writeHandoff(
      async (frame) => {
        if (signal.aborted) throw new Error("The handoff was cancelled.");
        await drainChannel(dc);
        dc.send(frame);
      },
      manifest,
      bytes,
      onProgress,
      signal,
    );
  } catch (err) {
    reply.catch(() => {});
    throw err;
  }
  const frame = await reply;
  if (frame.kind === "error") throw new Error(frame.message);
  if (frame.kind !== "applied") throw new Error("The other device did not confirm the handoff.");
}

export function receiveCollected(
  dc: RTCDataChannel,
  onProgress: (got: number, total: number) => void,
  signal: AbortSignal,
): Promise<{ manifest: HandoffManifest; bytes: HandoffBytes }> {
  if (dc.readyState === "closed" || dc.readyState === "closing") {
    return Promise.reject(new Error("The connection closed before the handoff finished."));
  }
  const incoming = new IncomingHandoff();
  let got = 0;
  let total = 0;
  return new Promise((resolve, reject) => {
    let chain = Promise.resolve();
    let settled = false;
    const cleanup = () => {
      dc.removeEventListener("message", onMessage);
      dc.removeEventListener("close", onClose);
      signal.removeEventListener("abort", onAbort);
    };
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err instanceof Error ? err : new Error("The handoff stopped."));
    };
    const onMessage = (ev: MessageEvent) => {
      chain = chain
        .then(async () => {
          if (settled) return;
          const frame = decodeFrame(await bytesOf(ev.data));
          if (frame.kind === "manifest") total = handoffByteCount(frame.manifest);
          if (frame.kind === "chunk") {
            got += frame.bytes.length;
            onProgress(got, total);
          }
          if (await incoming.push(frame)) {
            const result = await incoming.finish();
            if (settled) return;
            settled = true;
            cleanup();
            resolve(result);
          }
        })
        .catch(fail);
    };
    const onClose = () => fail(new Error("The connection closed before the handoff finished."));
    const onAbort = () => fail(new Error("The handoff was cancelled."));
    takeMessages(dc, onMessage);
    dc.addEventListener("close", onClose);
    signal.addEventListener("abort", onAbort);
    if (signal.aborted) onAbort();
  });
}

export async function confirmSaved(dc: RTCDataChannel): Promise<void> {
  dc.bufferedAmountLowThreshold = 0;
  dc.send(encodeApplied());
  if (dc.bufferedAmount === 0) return;
  await new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      dc.removeEventListener("bufferedamountlow", finish);
      resolve();
    };
    const timer = window.setTimeout(finish, 1000);
    dc.addEventListener("bufferedamountlow", finish);
  });
}

export function reportFailure(dc: RTCDataChannel, message: string): void {
  try {
    if (dc.readyState === "open") dc.send(encodeError(message));
  } catch {
    // The sender sees the connection close.
  }
}

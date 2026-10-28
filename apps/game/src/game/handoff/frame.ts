/**
 * The phone handoff's wire format. A session ticket is the WebRTC description (the connection, not the
 * file). Frames on the data channel carry the description, then file and record bytes, then a done mark.
 */

import { assertManifest, type HandoffManifest } from "./payload.ts";

export const FRAME_MANIFEST = 1;
export const FRAME_CHUNK = 2;
export const FRAME_DONE = 3;
export const FRAME_APPLIED = 4;
export const FRAME_ERROR = 5;

export type Frame =
  | { kind: "manifest"; manifest: HandoffManifest }
  | { kind: "chunk"; fileIndex: number; offset: number; bytes: Uint8Array }
  | { kind: "done" }
  | { kind: "applied" }
  | { kind: "error"; message: string };

const PART = /^STL1\.(\d+)\.(\d+)\.([A-Za-z0-9_-]+)$/;

export type SessionTicket = {
  v: 1;
  role: "offer" | "answer";
  sdp: string;
};

export function encodeManifest(manifest: HandoffManifest): Uint8Array {
  assertManifest(manifest);
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  if (json.length > 48_000) throw new Error("The handoff description is too large.");
  const out = new Uint8Array(1 + json.length);
  out[0] = FRAME_MANIFEST;
  out.set(json, 1);
  return out;
}

export function encodeChunk(fileIndex: number, offset: number, bytes: Uint8Array): Uint8Array {
  if (fileIndex < 0 || fileIndex > 0xffff || offset < 0) {
    throw new Error("The handoff sent an unknown piece.");
  }
  const out = new Uint8Array(7 + bytes.length);
  const view = new DataView(out.buffer);
  out[0] = FRAME_CHUNK;
  view.setUint16(1, fileIndex);
  view.setUint32(3, offset);
  out.set(bytes, 7);
  return out;
}

export function encodeDone(): Uint8Array {
  return new Uint8Array([FRAME_DONE]);
}

export function encodeApplied(): Uint8Array {
  return new Uint8Array([FRAME_APPLIED]);
}

export function encodeError(message: string): Uint8Array {
  const json = new TextEncoder().encode(message.slice(0, 400));
  const out = new Uint8Array(1 + json.length);
  out[0] = FRAME_ERROR;
  out.set(json, 1);
  return out;
}

export function decodeFrame(buf: Uint8Array): Frame {
  if (!buf.length) throw new Error("The connection sent an unexpected message.");
  const kind = buf[0];
  if (kind === FRAME_MANIFEST) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(buf.subarray(1)));
    } catch {
      throw new Error("The handoff description was not readable.");
    }
    assertManifest(parsed);
    return { kind: "manifest", manifest: parsed };
  }
  if (kind === FRAME_CHUNK) {
    if (buf.length < 7) throw new Error("A piece of the handoff arrived damaged.");
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return {
      kind: "chunk",
      fileIndex: view.getUint16(1),
      offset: view.getUint32(3),
      bytes: buf.slice(7),
    };
  }
  if (kind === FRAME_DONE) return { kind: "done" };
  if (kind === FRAME_APPLIED) return { kind: "applied" };
  if (kind === FRAME_ERROR) {
    const message = new TextDecoder().decode(buf.subarray(1)).trim();
    return { kind: "error", message: message || "The other device could not save the handoff." };
  }
  throw new Error("The connection sent an unexpected message.");
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(text: string): Uint8Array {
  const pad = text.length % 4 === 0 ? "" : "=".repeat(4 - (text.length % 4));
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** One or more `STL1.page.count.body` lines. Each line fits in a QR code. */
export async function encodeTicket(ticket: SessionTicket, piece = 700): Promise<string[]> {
  if ((ticket.role !== "offer" && ticket.role !== "answer") || !ticket.sdp) {
    throw new Error("This browser did not produce a connection code.");
  }
  const gz = await gzip(
    new TextEncoder().encode(JSON.stringify({ v: 1, role: ticket.role, sdp: ticket.sdp })),
  );
  const body = b64url(gz);
  const size = Math.max(1, Math.floor(piece));
  const count = Math.max(1, Math.ceil(body.length / size));
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(`STL1.${i + 1}.${count}.${body.slice(i * size, (i + 1) * size)}`);
  }
  return parts;
}

/**
 * Collect scanned or pasted lines. Returns the joined ticket once every page is present.
 * A page from a different code replaces the pages gathered so far.
 */
export function absorbTicket(
  bag: Map<number, string>,
  text: string,
): { have: number; need: number; done: string | null } {
  for (const line of text.split(/\s+/)) {
    const match = PART.exec(line);
    if (!match) continue;
    const index = Number(match[1]);
    const count = Number(match[2]);
    if (index < 1 || count < 1 || index > count || count > 40) continue;
    const sample = bag.values().next().value as string | undefined;
    const open = sample ? Number(PART.exec(sample)?.[2]) : 0;
    if ((open && open !== count) || (bag.get(index) && bag.get(index) !== line)) bag.clear();
    bag.set(index, line);
  }
  const sample = bag.values().next().value as string | undefined;
  const need = sample ? Number(PART.exec(sample)?.[2] ?? 0) : 0;
  if (!need) return { have: 0, need: 0, done: null };
  const parts: string[] = [];
  for (let i = 1; i <= need; i++) {
    const part = bag.get(i);
    if (part && Number(PART.exec(part)?.[2]) === need) parts.push(part);
  }
  if (parts.length !== need) return { have: parts.length, need, done: null };
  return { have: need, need, done: parts.join("\n") };
}

export async function decodeTicket(text: string): Promise<SessionTicket> {
  const absorbed = absorbTicket(new Map(), text);
  if (!absorbed.done) {
    throw new Error(
      absorbed.need
        ? `The code is incomplete (${absorbed.have} of ${absorbed.need}).`
        : "That code could not be read.",
    );
  }
  const body = absorbed.done
    .split(/\s+/)
    .map((line) => PART.exec(line)?.[3] ?? "")
    .join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(await gunzip(b64urlDecode(body))));
  } catch {
    throw new Error("That code could not be read.");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("That code could not be read.");
  const { v, role, sdp } = parsed as { v?: unknown; role?: unknown; sdp?: unknown };
  if (v !== 1 || (role !== "offer" && role !== "answer") || typeof sdp !== "string" || !sdp) {
    throw new Error("That code could not be read.");
  }
  return { v: 1, role, sdp };
}

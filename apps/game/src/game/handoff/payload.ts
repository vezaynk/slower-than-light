/**
 * What a phone handoff carries: the game-file order and bytes, the saved session, the earned
 * achievements, the ship unlocks those achievements grant, and the lifetime scrap and kill totals.
 * The load order changes only after the new blobs and the records are stored. A failure before that
 * deletes the new blobs and puts the records back.
 */

import { STAND_IN_ID, type ArchiveEntry } from "../pack/archive-list.ts";

export const CHUNK_BYTES = 16 * 1024;

export const TEXT_KEYS = ["save", "achievements", "unlocks", "life"] as const;
export type TextKey = (typeof TEXT_KEYS)[number];

export type HandoffFile = {
  name: string;
  size: number;
  enabled: boolean;
  builtin?: boolean;
};

export type HandoffText = {
  key: TextKey;
  size: number;
  digest: string;
};

export type HandoffManifest = {
  v: 1;
  files: HandoffFile[];
  digests: (string | null)[];
  texts: HandoffText[];
};

export type HandoffBytes = {
  /** Parallel to manifest.files. Absent for a built-in row. */
  files: (Blob | undefined)[];
  texts: Partial<Record<TextKey, string>>;
};

export type HandoffStore = {
  loadOrder(): Promise<ArchiveEntry[]>;
  saveOrder(list: readonly ArchiveEntry[]): Promise<void>;
  putBlob(id: string, blob: Blob): Promise<void>;
  deleteBlob(id: string): Promise<void>;
  readText(key: TextKey): string | null;
  writeText(key: TextKey, value: string | null): void;
  newId(): string;
};

const DIGEST = /^[0-9a-f]{64}$/;

export function assertManifest(value: unknown): asserts value is HandoffManifest {
  if (!value || typeof value !== "object")
    throw new Error("The handoff description was not readable.");
  const row = value as Partial<HandoffManifest>;
  if (
    row.v !== 1 ||
    !Array.isArray(row.files) ||
    !Array.isArray(row.digests) ||
    !Array.isArray(row.texts)
  ) {
    throw new Error("The handoff description was not readable.");
  }
  if (
    row.files.length > 64 ||
    row.digests.length !== row.files.length ||
    row.texts.length > TEXT_KEYS.length
  ) {
    throw new Error("The handoff description was not readable.");
  }
  for (let i = 0; i < row.files.length; i++) {
    const file = row.files[i];
    if (!file || typeof file.name !== "string" || !file.name || file.name.length > 256) {
      throw new Error("The handoff description was not readable.");
    }
    if (
      typeof file.size !== "number" ||
      !Number.isInteger(file.size) ||
      file.size < 0 ||
      file.size > 2_000_000_000
    ) {
      throw new Error("The handoff description was not readable.");
    }
    if (typeof file.enabled !== "boolean")
      throw new Error("The handoff description was not readable.");
    const digest = row.digests[i];
    if (file.builtin) {
      if (file.size !== 0 || digest !== null)
        throw new Error("The handoff description was not readable.");
    } else if (typeof digest !== "string" || !DIGEST.test(digest)) {
      throw new Error("The handoff description was not readable.");
    }
  }
  const seen = new Set<string>();
  for (const text of row.texts) {
    if (!text || !TEXT_KEYS.includes(text.key) || seen.has(text.key)) {
      throw new Error("The handoff description was not readable.");
    }
    seen.add(text.key);
    if (
      typeof text.size !== "number" ||
      !Number.isInteger(text.size) ||
      text.size < 0 ||
      text.size > 8_000_000
    ) {
      throw new Error("The handoff description was not readable.");
    }
    if (typeof text.digest !== "string" || !DIGEST.test(text.digest)) {
      throw new Error("The handoff description was not readable.");
    }
  }
}

export function handoffByteCount(manifest: HandoffManifest): number {
  return (
    manifest.files.reduce((sum, file) => sum + file.size, 0) +
    manifest.texts.reduce((sum, text) => sum + text.size, 0)
  );
}

export function recordName(key: TextKey): string {
  if (key === "save") return "The saved game";
  if (key === "achievements") return "The achievements";
  if (key === "unlocks") return "The unlocked ships";
  return "The achievement totals";
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", copy));
}

export function digestHex(state: Uint8Array): string {
  let out = "";
  for (const byte of state) out += byte.toString(16).padStart(2, "0");
  return out;
}

/** The digest of an empty byte string. Chunks fold into a copy of this. */
export async function freshDigest(): Promise<Uint8Array> {
  return sha256(new Uint8Array());
}

export async function mixDigest(state: Uint8Array, chunk: Uint8Array): Promise<Uint8Array> {
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, chunk.length);
  const buf = new Uint8Array(state.length + 4 + chunk.length);
  buf.set(state, 0);
  buf.set(len, state.length);
  buf.set(chunk, state.length + 4);
  return sha256(buf);
}

export async function digestBytes(bytes: Uint8Array): Promise<string> {
  let state = await freshDigest();
  for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
    state = await mixDigest(state, bytes.subarray(offset, offset + CHUNK_BYTES));
  }
  return digestHex(state);
}

export async function digestBlob(blob: Blob): Promise<string> {
  let state = await freshDigest();
  let offset = 0;
  while (offset < blob.size) {
    const slice = new Uint8Array(await blob.slice(offset, offset + CHUNK_BYTES).arrayBuffer());
    if (!slice.length) break;
    state = await mixDigest(state, slice);
    offset += slice.length;
  }
  return digestHex(state);
}

async function verifyBytes(manifest: HandoffManifest, bytes: HandoffBytes): Promise<void> {
  assertManifest(manifest);
  if (bytes.files.length !== manifest.files.length)
    throw new Error("The handoff is missing a file.");
  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i]!;
    const blob = bytes.files[i];
    if (file.builtin) {
      if (blob && blob.size) throw new Error("The handoff sent bytes for a built-in file.");
      continue;
    }
    if (!blob || blob.size !== file.size) throw new Error(`${file.name} arrived short.`);
    if ((await digestBlob(blob)) !== manifest.digests[i])
      throw new Error(`${file.name} arrived damaged.`);
  }
  for (const key of TEXT_KEYS) {
    const row = manifest.texts.find((text) => text.key === key);
    const value = bytes.texts[key];
    if (!row) {
      if (value !== undefined) throw new Error("The handoff included an unexpected record.");
      continue;
    }
    if (value === undefined) throw new Error(`${recordName(key)} arrived short.`);
    const encoded = new TextEncoder().encode(value);
    if (encoded.length !== row.size || (await digestBytes(encoded)) !== row.digest) {
      throw new Error(`${recordName(key)} arrived damaged.`);
    }
  }
}

const STAND_IN: ArchiveEntry = {
  id: STAND_IN_ID,
  name: "Stand-in archive",
  size: 0,
  enabled: true,
  builtin: true,
};

/**
 * Store a received handoff. The previous order and records stay in place until the new blobs are
 * stored and the new order is saved. A throw before that save puts the records back and deletes
 * only the blobs this attempt created.
 */
export async function commitHandoff(
  manifest: HandoffManifest,
  bytes: HandoffBytes,
  store: HandoffStore,
): Promise<void> {
  await verifyBytes(manifest, bytes);
  const previous = await store.loadOrder();
  const created: string[] = [];
  const next: ArchiveEntry[] = [];
  let placed = false;
  try {
    for (let i = 0; i < manifest.files.length; i++) {
      const file = manifest.files[i]!;
      if (file.builtin) {
        if (placed) continue;
        placed = true;
        next.push({ ...STAND_IN, enabled: file.enabled });
        continue;
      }
      const blob = bytes.files[i]!;
      const id = store.newId();
      await store.putBlob(id, blob);
      created.push(id);
      next.push({ id, name: file.name, size: blob.size, enabled: file.enabled });
    }
    if (!placed) next.unshift({ ...STAND_IN });

    const backup = new Map<TextKey, string | null>();
    for (const key of TEXT_KEYS) backup.set(key, store.readText(key));
    try {
      for (const key of TEXT_KEYS) store.writeText(key, bytes.texts[key] ?? null);
      await store.saveOrder(next);
    } catch (err) {
      for (const key of TEXT_KEYS) {
        try {
          store.writeText(key, backup.get(key) ?? null);
        } catch {
          // The original write failed. Putting the previous record back is the best this step can do.
        }
      }
      throw err;
    }
  } catch (err) {
    for (const id of created) {
      try {
        await store.deleteBlob(id);
      } catch {
        // An orphan blob is not in the order, so boot does not read it.
      }
    }
    throw err;
  }

  for (const row of previous) {
    if (row.builtin || created.includes(row.id)) continue;
    try {
      await store.deleteBlob(row.id);
    } catch {
      // The new order is already saved. An old blob left behind is not loaded.
    }
  }
}

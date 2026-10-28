/**
 * Read and write the handoff against this browser: IndexedDB game files, the saved session, earned
 * achievements, the unlocks those achievements grant, and the lifetime scrap and kill totals.
 */

import {
  deleteBlob,
  fileBlob,
  loadOrder,
  putBlob,
  saveOrder,
  STAND_IN_ID,
} from "../pack/archive-list.ts";
import { replaceSavedSession, savedSessionRaw } from "../sim.ts";
import {
  replaceUnlockRecord,
  resetUnlockMemory,
  unlockRecordRaw,
  getUnlocks,
} from "../unlock-store.ts";
import {
  achievementRecordRaw,
  earnedIds,
  replaceAchievementRecord,
  resetAchievementMemory,
} from "../wiki/achievement-track.ts";
import { lifetimeRecordRaw, replaceLifetimeRecord, storedLifetime } from "../wiki/achieve-notes.ts";
import {
  commitHandoff,
  digestBlob,
  digestBytes,
  type HandoffBytes,
  type HandoffFile,
  type HandoffManifest,
  type HandoffStore,
  type HandoffText,
  type TextKey,
} from "./payload.ts";

export type HandoffInventory = {
  files: { name: string; size: number; enabled: boolean; builtin: boolean; missing: boolean }[];
  save: boolean;
  achievements: number;
  ships: number;
  scrap: number;
  kills: number;
};

const store: HandoffStore = {
  loadOrder,
  saveOrder,
  putBlob,
  deleteBlob,
  readText(key) {
    if (key === "save") return savedSessionRaw();
    if (key === "achievements") return achievementRecordRaw();
    if (key === "unlocks") return unlockRecordRaw();
    return lifetimeRecordRaw();
  },
  writeText(key, value) {
    if (key === "save") replaceSavedSession(value);
    else if (key === "achievements") replaceAchievementRecord(value);
    else if (key === "unlocks") replaceUnlockRecord(value);
    else replaceLifetimeRecord(value);
  },
  newId() {
    return `file:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  },
};

function rawText(key: TextKey): string | null {
  return store.readText(key);
}

/** What this browser would send, without reading the file bytes. */
export async function handoffInventory(): Promise<HandoffInventory> {
  const order = await loadOrder();
  const files = [];
  for (const row of order) {
    const missing = row.builtin ? false : !(await fileBlob(row.id));
    files.push({
      name: row.name,
      size: row.size,
      enabled: row.enabled,
      builtin: row.id === STAND_IN_ID || !!row.builtin,
      missing,
    });
  }
  const life = storedLifetime();
  return {
    files,
    save: savedSessionRaw() != null,
    achievements: earnedIds().length,
    ships: getUnlocks().ships.length,
    scrap: life.scrap,
    kills: life.kills,
  };
}

/** The bytes to send, with a digest of each file and record. */
export async function collectHandoff(): Promise<{
  manifest: HandoffManifest;
  bytes: HandoffBytes;
}> {
  const order = await loadOrder();
  const files: HandoffFile[] = [];
  const digests: (string | null)[] = [];
  const blobs: (Blob | undefined)[] = [];
  for (const row of order) {
    if (row.builtin) {
      files.push({ name: row.name, size: 0, enabled: row.enabled, builtin: true });
      digests.push(null);
      blobs.push(undefined);
      continue;
    }
    const blob = await fileBlob(row.id);
    if (!blob) throw new Error(`${row.name} is no longer stored in this browser.`);
    files.push({ name: row.name, size: blob.size, enabled: row.enabled });
    digests.push(await digestBlob(blob));
    blobs.push(blob);
  }
  const texts: HandoffText[] = [];
  const textValues: HandoffBytes["texts"] = {};
  for (const key of ["save", "achievements", "unlocks", "life"] as const) {
    const raw = rawText(key);
    if (raw == null) continue;
    const encoded = new TextEncoder().encode(raw);
    texts.push({ key, size: encoded.length, digest: await digestBytes(encoded) });
    textValues[key] = raw;
  }
  return { manifest: { v: 1, files, digests, texts }, bytes: { files: blobs, texts: textValues } };
}

/** Save a received handoff, then drop the in-memory achievement and unlock copies. */
export async function applyReceived(manifest: HandoffManifest, bytes: HandoffBytes): Promise<void> {
  await commitHandoff(manifest, bytes, store);
  resetAchievementMemory();
  resetUnlockMemory();
}

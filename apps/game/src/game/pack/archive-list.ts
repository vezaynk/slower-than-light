/**
 * Per the user: the player's game files and their load order, kept in IndexedDB so a 270 MB ftl.dat survives a reload.
 * The first enabled file is the base archive. Each later one is applied over it as a mod, top to bottom.
 * The campaign rules (base.ftl) are not in this list: boot always applies them last.
 */

/** The bundled stand-in archive. It sits in the order like a player file, and cannot be removed. */
export const STAND_IN_ID = "builtin:stand-in";

export type ArchiveEntry = {
  id: string;
  name: string;
  size: number;
  enabled: boolean;
  /** Built-in entries have no stored blob and cannot be removed. */
  builtin?: boolean;
};

const DB_NAME = "stl-archives";
const FILES = "files";
const META = "meta";
const ORDER_KEY = "order";

const DEFAULT_ORDER: ArchiveEntry[] = [
  { id: STAND_IN_ID, name: "Stand-in archive", size: 0, enabled: true, builtin: true },
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser has no IndexedDB."));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB did not open."));
  });
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  act: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = act(tx.objectStore(store));
        let value: T | undefined;
        if (req) req.onsuccess = () => (value = req.result);
        tx.oncomplete = () => {
          db.close();
          resolve(value);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("IndexedDB write failed."));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("IndexedDB write was aborted (the disk may be full)."));
        };
      }),
  );
}

function clean(list: unknown): ArchiveEntry[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out: ArchiveEntry[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const { id, name, size, enabled, builtin } = row as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string") continue;
    out.push({
      id,
      name,
      size: typeof size === "number" ? size : 0,
      enabled: enabled !== false,
      ...(builtin === true ? { builtin: true } : {}),
    });
  }
  // The stand-in is always somewhere in the list, so it can be turned back on.
  if (!out.some((row) => row.id === STAND_IN_ID)) out.unshift({ ...DEFAULT_ORDER[0]! });
  return out;
}

/** The saved order, or the stand-in alone when nothing was saved. */
export async function loadOrder(): Promise<ArchiveEntry[]> {
  try {
    const saved = await run<unknown>(META, "readonly", (s) => s.get(ORDER_KEY));
    return clean(saved) ?? DEFAULT_ORDER.map((row) => ({ ...row }));
  } catch {
    return DEFAULT_ORDER.map((row) => ({ ...row }));
  }
}

export async function saveOrder(list: readonly ArchiveEntry[]): Promise<void> {
  await run(META, "readwrite", (s) => {
    s.put(
      list.map((row) => ({ ...row })),
      ORDER_KEY,
    );
  });
}

/** Stores each file and adds it to the bottom of the order. */
export async function addFiles(
  list: readonly ArchiveEntry[],
  files: readonly File[],
): Promise<ArchiveEntry[]> {
  const next = [...list];
  for (const file of files) {
    const id = `file:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await run(FILES, "readwrite", (s) => {
      s.put(file, id);
    });
    next.push({ id, name: file.name, size: file.size, enabled: true });
  }
  await saveOrder(next);
  return next;
}

export async function removeFile(
  list: readonly ArchiveEntry[],
  id: string,
): Promise<ArchiveEntry[]> {
  const next = list.filter((row) => row.id !== id || row.builtin);
  await run(FILES, "readwrite", (s) => {
    s.delete(id);
  });
  await saveOrder(next);
  return next;
}

/** A stored player file. Undefined for a built-in entry or a blob the browser dropped. */
export async function fileBlob(id: string): Promise<Blob | undefined> {
  const blob = await run<unknown>(FILES, "readonly", (s) => s.get(id));
  return blob instanceof Blob ? blob : undefined;
}

/** Forget every player file and go back to the stand-in. */
export async function resetArchives(): Promise<ArchiveEntry[]> {
  await run(FILES, "readwrite", (s) => {
    s.clear();
  });
  const next = DEFAULT_ORDER.map((row) => ({ ...row }));
  await saveOrder(next);
  return next;
}

/** The part of the order that changes what boot loads. */
export function orderKey(list: readonly ArchiveEntry[]): string {
  return list
    .filter((row) => row.enabled)
    .map((row) => row.id)
    .join("|");
}

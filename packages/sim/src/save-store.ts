/** Where a saved run is kept. The browser store is the default. A host can replace it. */
export type SaveStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

let installed: SaveStore | null | undefined;

function browserStore(): SaveStore | null {
  const storage = (globalThis as { localStorage?: SaveStore }).localStorage;
  if (!storage || typeof storage.getItem !== "function") return null;
  return storage;
}

/** Replace the save store. `null` saves nowhere. Omit the call and the browser store is used when it exists. */
export function bindSaveStore(store: SaveStore | null): void {
  installed = store;
}

/** Drop a host store so the next read uses the browser store again. */
export function resetSaveStore(): void {
  installed = undefined;
}

export function saveStore(): SaveStore | null {
  if (installed !== undefined) return installed;
  return browserStore();
}

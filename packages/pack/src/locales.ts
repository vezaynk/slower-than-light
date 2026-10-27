import type { LocaleTable } from "./types.ts";

/** Loaded translation tables. English stays off this list. */
let localeTables: LocaleTable[] = [];
let baseLocales: LocaleTable[] = [];

function copyLocales(rows: LocaleTable[] | undefined): LocaleTable[] {
  return (rows ?? []).map((row) => ({ code: row.code, strings: { ...row.strings } }));
}

function mergeLocales(current: LocaleTable[], extra: LocaleTable[]): LocaleTable[] {
  const next = copyLocales(current);
  for (const row of extra) {
    const found = next.find((item) => item.code === row.code);
    if (found) Object.assign(found.strings, row.strings);
    else next.push({ code: row.code, strings: { ...row.strings } });
  }
  return next;
}

/** A base pack replaces the tables and the restore point. */
export function storeLocales(rows: LocaleTable[] | undefined): void {
  localeTables = copyLocales(rows);
  baseLocales = copyLocales(rows);
}

/** An append merges by code. A new code is added at the end. */
export function mergeStoredLocales(extra: LocaleTable[]): void {
  localeTables = mergeLocales(localeTables, extra);
}

/** Put the tables back to the last base pack. */
export function resetLocales(): void {
  localeTables = copyLocales(baseLocales);
}

/** Translation tables the loaded pack carried. English is not one of these. */
export function packLocales(): LocaleTable[] {
  return copyLocales(localeTables);
}

/** One string from `text-<code>.xml`. Absent when that code or key was not loaded. */
export function localeString(code: string, key: string): string | undefined {
  return localeTables.find((row) => row.code === code)?.strings[key];
}

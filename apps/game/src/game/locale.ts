/** The pack's locale tables. English stays the default until a title-screen choice selects one. */
import { FONT_FACES, localeString } from "@stl/pack";

let current = "en";
let onSelect: ((code: string) => void) | null = null;

/** The app points this at the image-variant switch. The simulation does not touch the document. */
export function bindLocaleImages(fn: ((code: string) => void) | null): void {
  onSelect = fn;
}

export function selectLocale(code: string): void {
  current = code;
  onSelect?.(code);
}

export function currentLocale(): string {
  return current;
}

/** A translated string, or the English line when this locale has no entry. English never looks one up. */
export function localeLabel(key: string, english: string): string {
  if (current === "en") return english;
  return localeString(current, key) ?? english;
}

/** The face whose font file is `fonts/<code>.font`. English keeps the built-in faces. */
export function localeFace(): string | undefined {
  if (current === "en") return undefined;
  return FONT_FACES.find((face) => face.path === `fonts/${current}.font`)?.family;
}

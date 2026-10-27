/** The pack's locale tables. English stays the default until a title-screen choice selects one. */
import { FONT_FACES, localeString } from "@stl/pack";
import { setImageVariant } from "./pack/media.ts";

let current = "en";

export function selectLocale(code: string): void {
  current = code;
  setImageVariant({ lang: code });
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

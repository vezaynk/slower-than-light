/** The pack's locale tables. English stays the default until a title-screen choice selects one. */
import { localeString } from "@stl/pack";
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

/** The stand-in Esperanto face. Any other locale keeps the English faces. */
export function localeFace(): string | undefined {
  return current === "eo" ? "EoFont" : undefined;
}

/**
 * Per the user: all user-facing text lives in en.json, so the copy can be replaced without touching code.
 * scripts/i18n-codemod.mjs moves new prose there. `tx` is synchronous and works outside React (the sim builds its
 * event cards and log lines with it), so it runs the same in the browser and in node tests.
 */
import i18next from "i18next";
import en from "./en.json" with { type: "json" };

const i18n = i18next.createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: en } },
  initAsync: false,
  // Keys are flat ("wiki.cited-events.you-receive-a-weapon"); dots and colons in them are not paths.
  keySeparator: false,
  nsSeparator: false,
  // Plain text, not HTML: React escapes on render.
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** The text for `key`, with {{name}} placeholders filled from `vars`. */
export function tx(key: string, vars?: Record<string, unknown>): string {
  return vars ? (i18n.t(key, vars) as string) : (i18n.t(key) as string);
}

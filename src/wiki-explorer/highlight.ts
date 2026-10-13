import { fold } from "./wikitext.ts";

/** Longest phrases win, so a sentence stays one mark instead of a scatter of shorter ones. */
export function cover(text: string, phrases: readonly string[]): { start: number; end: number; phrase: string }[] {
  if (!phrases.length || !text) return [];
  const folded = fold(text);
  const used = new Uint8Array(folded.text.length);
  const found: { start: number; end: number; phrase: string }[] = [];
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    const needle = fold(phrase).text;
    if (needle.length < 8) continue;
    let from = 0;
    while (from <= folded.text.length - needle.length) {
      const at = folded.text.indexOf(needle, from);
      if (at < 0) break;
      let clash = false;
      for (let k = at; k < at + needle.length; k++) if (used[k]) clash = true;
      if (!clash) {
        for (let k = at; k < at + needle.length; k++) used[k] = 1;
        found.push({
          start: folded.map[at]!,
          end: folded.map[at + needle.length - 1]! + 1,
          phrase,
        });
      }
      from = at + needle.length;
    }
  }
  found.sort((a, b) => a.start - b.start);
  return found;
}

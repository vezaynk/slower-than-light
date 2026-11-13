import type { Document as XmlDocument } from "@xmldom/xmldom";
import { registerArchiveExtra } from "../archive-extras.ts";
import { attr, ownText, tagged } from "../parse.ts";

const phrases = new Map<string, string>();

/** English words for one archive string id. Undefined when this pack has no such key. */
export function archivePhrase(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const text = phrases.get(key);
  return text && text.trim() ? text : undefined;
}

let basePhrases = new Map<string, string>();

/** Keeps the phrases of the archive a `"base"` load installs, so a test reset can put them back. */
export function snapshotArchivePhrases(): void {
  basePhrases = new Map(phrases);
}

/** Puts back the phrases of the last `"base"` load when a test restores the stand-in snapshot. */
export function restoreArchivePhrases(): void {
  phrases.clear();
  for (const [key, value] of basePhrases) phrases.set(key, value);
}

/** `text-<code>.xml` is a translation. English tables are `text_<kind>.xml`. */
function translationFile(path: string): boolean {
  const name = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
  return /^text-.+\.xml(?:\.append)?$/i.test(name);
}

function collect(doc: XmlDocument): void {
  for (const node of tagged(doc, "text")) {
    if (attr(node, "language")?.trim()) continue;
    const key = attr(node, "name")?.trim();
    if (!key) continue;
    const value = phraseText(ownText(node));
    if (value.trim()) phrases.set(key, value);
  }
}

/**
 * A phrase can be a separator. One leading or trailing space is part of the string.
 * Any other surrounding whitespace belongs to the file.
 */
function phraseText(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  return `${raw.startsWith(" ") ? " " : ""}${value}${raw.endsWith(" ") ? " " : ""}`;
}

registerArchiveExtra({
  id: "phrases",
  apply(_pack, docs) {
    phrases.clear();
    for (const source of docs) {
      if (translationFile(source.path)) continue;
      collect(source.doc);
    }
  },
});

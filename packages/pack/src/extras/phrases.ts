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

/** Drops phrases when a test restores the stand-in snapshot without loading a pack. */
export function clearArchivePhrases(): void {
  phrases.clear();
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
    const value = ownText(node).trim();
    if (value) phrases.set(key, value);
  }
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

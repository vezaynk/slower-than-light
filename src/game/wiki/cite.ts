/**
 * Record that this code implements a wiki sentence whose wording is paraphrased,
 * so a verbatim search would miss it.
 *
 * The reader cites the site as `file#anchor`: the `anchor` you pass (a choice id
 * or other stable name), or the enclosing function when you omit it. It does not
 * store a line number. `phrase` is the wiki's own wording.
 */
export function wikiCite(page: string, phrase: string, anchor?: string): void {
  void page;
  void phrase;
  void anchor;
}

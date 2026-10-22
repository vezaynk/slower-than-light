import { creditsLines, creditsText, isCreditsFile } from "../credits.ts";
import { registerCoverExtra } from "../archive-cover-extra.ts";

/** The file's own lines. Kept apart from the reader so a stub cannot pass. */
function fileLines(body: string): string[] {
  return body
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
}

/** Shown when the body has text and the reader returned those lines. */
function shown(body: string, lines: readonly string[]): boolean {
  if (body.length === 0) return false;
  const expected = fileLines(body);
  return lines.length === expected.length && lines.every((line, index) => line === expected[index]);
}

/** `data/credits.txt` is the credits roll, not a hull grid. */
registerCoverExtra({
  id: "credits",
  textFile(path, body, problems) {
    if (!isCreditsFile(path)) return false;
    if (!shown(body, creditsLines(body))) problems.push("credits text is not shown");
    return true;
  },
  exercise(_raw, merged, problems) {
    const body = creditsText(merged);
    if (body == null) return;
    if (!shown(body, creditsLines(body))) problems.push("credits text is not shown");
  },
});

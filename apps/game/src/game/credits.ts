import type { FtlExtract } from "@stl/ftldat";

const CREDITS_NAME = "credits.txt";

/** True for `data/credits.txt`. Any other text path is a ship layout and stays unclaimed. */
export function isCreditsFile(path: string): boolean {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return path.slice(slash + 1).toLowerCase() === CREDITS_NAME;
}

/**
 * Lines of the credits roll, in file order.
 * A blank line is kept. A trailing newline stays as an empty last line, so the
 * lines join back to the file.
 */
export function creditsLines(body: string): string[] {
  return normalize(body).split("\n");
}

/** Body of `data/credits.txt` on an extract's text map, or undefined when the archive has none. */
export function creditsText(extract: FtlExtract): string | undefined {
  for (const [path, body] of extract.text) {
    if (isCreditsFile(path)) return body;
  }
  return undefined;
}

function normalize(body: string): string {
  return body
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

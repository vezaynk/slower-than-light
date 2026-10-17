/** Folder name for one recording of every selected scenario. */
export function takeId(input: { branch: string; sha: string; dirty: boolean; label?: string }): string {
  const named = input.label?.trim();
  const base = (named || `${input.branch}-${input.sha.slice(0, 7)}`)
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const id = base || "take";
  return input.dirty && !named ? `${id}-dirty` : id;
}

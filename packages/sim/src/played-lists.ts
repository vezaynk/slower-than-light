/**
 * Blueprint lists a play function actually read.
 * `blueprintList` itself does not count: the coverage check calls it for every list.
 */
const played = new Set<string>();

export function noteListPlayed(id: string | undefined): void {
  if (id) played.add(id);
}

export function listWasPlayed(id: string): boolean {
  return played.has(id);
}

export function resetPlayedLists(): void {
  played.clear();
}

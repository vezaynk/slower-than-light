import type { RollEntry } from "@stl/pack";

/**
 * Lists a beacon page draws when the card opens.
 * The sim still draws one entry with between. A repeated hull is a heavier weight.
 */

/** Printed hull counts from Fight in Last Stand. A repeated name is a heavier weight. */
const LAST_STAND: RollEntry[] = [
  { k: "hull", id: "Auto-Scout" },
  { k: "hull", id: "Auto-Scout" },
  { k: "hull", id: "Auto-Surveyor" },
  { k: "hull", id: "Auto-Assault" },
  { k: "hull", id: "Auto-Assault" },
  { k: "hull", id: "Auto-Hacker" },
  { k: "hull", id: "rebel-rigger" },
  { k: "hull", id: "rebel-rigger" },
  { k: "hull", id: "rebel-disruptor" },
  { k: "hull", id: "rebel-fighter" },
  { k: "hull", id: "rebel-fighter" },
  { k: "hull", id: "rebel-invader" },
];

/** Four hide labels. The page gives no odds. */
const HIDE: RollEntry[] = [
  { k: "label", text: "Fly behind a moon and stay hidden." },
  { k: "label", text: "Shut down all non-vital systems and stay hidden." },
  { k: "label", text: "Stay quiet and hope they don't notice you." },
  { k: "label", text: "Stay out of their way and charge your FTL drive." },
];

/** Four printed moon counts. The page gives no odds. */
const MOONS: RollEntry[] = [
  { k: "count", n: 5, word: "five" },
  { k: "count", n: 6, word: "six" },
  { k: "count", n: 7, word: "seven" },
  { k: "count", n: 11, word: "eleven" },
];

export const ROLL_LISTS: Record<string, readonly RollEntry[]> = {
  "fight-in-last-stand": LAST_STAND,
  "rebel-checkpoint": HIDE,
  "slug-moons-question": MOONS,
};

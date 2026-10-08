/**
 * Lanius candidate pages. Redirects have no opening choice.
 * Lanius ship absorbing rebel base runs its branches in filler-events.ts.
 * An unnamed augmentation stays unwired.
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "nothing" };

export type CitedEventDef = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: { id: string; label: string; fx: CitedFx[] }[];
};

export const EXTRA_EVENTS: CitedEventDef[] = [
  {
    // Lanius ship absorbing rebel base. The delay, the fight, and the Lanius crew run in filler-events.ts.
    dest: "Lanius ship absorbing rebel base",
    slug: "lanius-ship-absorbing-rebel-base",
    flag: "cited:lanius-ship-absorbing-rebel-base",
    aliases: ["Lanius ship absorbing rebel base"],
    sectors: ["Abandoned Sector"],
    body: "You notice a number of Lanius ships absorbing a forward Rebel base and its automated scouts. They don't seem to be aggressive. Perhaps their desire for metal could prove to be useful?",
    choices: [
      {
        id: "c:lanius-ship-absorbing-rebel-base:0",
        label: "Try to use them to delay the Rebels.",
        // "Medium scrap, a Lanius ship, or nothing."
        fx: [{ k: "note", text: "Medium scrap and a fleet delay, a Lanius ship, or nothing." }],
      },
      {
        id: "c:lanius-ship-absorbing-rebel-base:1",
        label: "Leave them alone.",
        // "Nothing happens."
        fx: [{ k: "note", text: "Nothing happens." }],
      },
      {
        id: "c:lanius-ship-absorbing-rebel-base:2",
        label: "Try to use them to delay the Rebels.",
        // "Lanius crew. Medium scrap and a fleet delay."
        fx: [{ k: "note", text: "Medium scrap and a fleet delay." }],
      },
    ],
  },
];

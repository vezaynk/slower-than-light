import { tx } from "../../i18n/index.ts";
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
    // Lanius ship absorbing jump beacon. Abandoned Sector. unique=true. LRSmap=ship.
    // Ask, leave, the Lanius decline, and the Hull Repair Drone run in filler-events.ts.
    // Sending 30 scrap, and giving 30 scrap, 6 missiles, or 6 drone parts, each grant an unnamed augmentation and stay unwired.
    dest: "Lanius ship absorbing jump beacon",
    slug: "lanius-ship-absorbing-jump-beacon",
    flag: "cited:lanius-ship-absorbing-jump-beacon",
    aliases: ["Lanius ship absorbing jump beacon"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-lanius.you-detect-a-damaged-vessel-docked"),
    choices: [
      {
        id: "c:lanius-ship-absorbing-jump-beacon:0",
        label: tx("wiki.cited-events-lanius.ask-if-they-require-assistance"),
        // A Lanius ship, or the translator. No odds.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.a-lanius-ship-or-the-translator") }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:1",
        label: tx("wiki.cited-events-lanius.leave"),
        // Nothing, or a Lanius ship.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-or-a-lanius-ship") }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:2",
        label: tx("wiki.cited-events-lanius.lanius-crew-ask-if-they-require"),
        // Decline. Nothing happens. The material trades stay unwired.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-happens") }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:3",
        label: tx("wiki.cited-events-lanius.hull-repair-drone-send-a-drone"),
        // A Lanius crewmember. No drone part is printed.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.a-lanius-crewmember") }],
      },
    ],
  },
  {
    // Lanius ship absorbing rebel base. The delay, the fight, and the Lanius crew run in filler-events.ts.
    dest: "Lanius ship absorbing rebel base",
    slug: "lanius-ship-absorbing-rebel-base",
    flag: "cited:lanius-ship-absorbing-rebel-base",
    aliases: ["Lanius ship absorbing rebel base"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-lanius.you-notice-a-number-of-lanius"),
    choices: [
      {
        id: "c:lanius-ship-absorbing-rebel-base:0",
        label: tx("wiki.cited-events-lanius.try-to-use-them-to-delay"),
        // "Medium scrap, a Lanius ship, or nothing."
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.medium-scrap-and-a-fleet-delay") }],
      },
      {
        id: "c:lanius-ship-absorbing-rebel-base:1",
        label: tx("wiki.cited-events-lanius.leave-them-alone"),
        // "Nothing happens."
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-happens") }],
      },
      {
        id: "c:lanius-ship-absorbing-rebel-base:2",
        label: tx("wiki.cited-events-lanius.try-to-use-them-to-delay"),
        // "Lanius crew. Medium scrap and a fleet delay."
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.medium-scrap-and-a-fleet-delay-2") }],
      },
    ],
  },
  {
    // Lanius craftsmen. Abandoned Sector. unique=true. LRSmap=noship.
    // The inquiry and the leave run in filler-events.ts.
    // 45 scrap, 50 scrap, and 40 scrap each grant an unnamed item and stay unwired.
    // A Lanius crewmember discounts those same trades and stays unwired.
    dest: "Lanius craftsmen",
    slug: "lanius-craftsmen",
    flag: "cited:lanius-craftsmen",
    aliases: ["Lanius craftsmen"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-lanius.a-merchant-ship-is-docked-with"),
    choices: [
      {
        id: "c:lanius-craftsmen:0",
        label: tx("wiki.cited-events-lanius.inquire-about-the-process"),
        // Decline. Nothing happens. The crafts stay unwired.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-happens") }],
      },
      {
        id: "c:lanius-craftsmen:1",
        label: tx("wiki.cited-events-lanius.leave-them-to-their-research"),
        // "Nothing happens."
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-happens") }],
      },
    ],
  },
];

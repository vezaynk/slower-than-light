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
    body: "You detect a damaged vessel docked with the jump beacon. It appears the Lanius are absorbing metal from the beacon, risking destroying it and becoming stranded.",
    choices: [
      {
        id: "c:lanius-ship-absorbing-jump-beacon:0",
        label: "Ask if they require assistance.",
        // A Lanius ship, or the translator. No odds.
        fx: [{ k: "note", text: "A Lanius ship, or the translator." }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:1",
        label: "Leave.",
        // Nothing, or a Lanius ship.
        fx: [{ k: "note", text: "Nothing, or a Lanius ship." }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:2",
        label: "(Lanius Crew) Ask if they require assistance.",
        // Decline. Nothing happens. The material trades stay unwired.
        fx: [{ k: "note", text: "Nothing happens." }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:3",
        label: "(Hull Repair Drone) Send a drone to help.",
        // A Lanius crewmember. No drone part is printed.
        fx: [{ k: "note", text: "A Lanius crewmember." }],
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
    body: "A merchant ship is docked with a Lanius transport. You message them to see if they need any help. It turns out they have been studying the Lanius's ability to reshape metal.",
    choices: [
      {
        id: "c:lanius-craftsmen:0",
        label: "Inquire about the process.",
        // Decline. Nothing happens. The crafts stay unwired.
        fx: [{ k: "note", text: "Nothing happens." }],
      },
      {
        id: "c:lanius-craftsmen:1",
        label: "Leave them to their research.",
        // "Nothing happens."
        fx: [{ k: "note", text: "Nothing happens." }],
      },
    ],
  },
];

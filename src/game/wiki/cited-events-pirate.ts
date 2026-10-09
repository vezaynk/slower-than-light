/**
 * Stated outcomes from the pirate title list.
 * A page is absent when no opening choice has one resource amount, scrap tier,
 * hull number, fleet delay, or named fight. Blue options and crew are not granted.
 * Refugee (Pirate) and Refugee distress (Pirate) are playable cards. Their hails run in filler-events.ts.
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
  // "Fight a Pirate ship (default rewards)." Pirate fight in nebula has no choice. Arrival calls this fight. One of the five printed intros. nebula=true. unique=false. No nebula environment is added.
  {
    dest: "Pirate fight in nebula",
    slug: "pirate-fight-in-nebula",
    flag: "cited:pirate-fight-in-nebula",
    aliases: ["Pirate fight in nebula"],
    sectors: ["Pirate Controlled Sector", "Uncharted Nebula"],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-in-nebula:0",
        label: "Fight a Pirate ship",
        fx: [
          // "Fight a Pirate ship (default rewards)."
          { k: "fight", tier: "Pirate ship" },
        ],
      },
    ],
  },
  // Refugee (Pirate). Template:Drifting Refugee Ship, introtext=nodistress, type=pirate.
  // Pirate Controlled Sector. unique=false. LRSmap=noship.
  // Hail is a trade or the pirate bait. type=pirate does not wrap the trade in DuplicateEvent|4.
  {
    dest: "Refugee (Pirate)",
    slug: "refugee-pirate",
    flag: "cited:refugee-pirate",
    aliases: ["Refugee (Pirate)"],
    sectors: ["Pirate Controlled Sector"],
    body: "Your sensors have picked up a refugee ship drifting through the system, no doubt one of many fleeing the Rebel advance. It doesn't appear to have detected you... or else it is trying to avoid notice.",
    choices: [
      { id: "c:refugee-pirate:0", label: "Hail them.", fx: [{ k: "note", text: "A trade, or a pirate ship using them as bait." }] },
      { id: "c:refugee-pirate:1", label: "Ignore the refugees.", fx: [{ k: "nothing" }] },
    ],
  },
  // Refugee distress (Pirate). Template:Drifting Refugee Ship, introtext=distress, type=pirate.
  // Pirate Controlled Sector. distress=true. unique=false. LRSmap=noship.
  // The same type=pirate hail. Not on the EventList distress beacon list.
  {
    dest: "Refugee distress (Pirate)",
    slug: "refugee-distress-pirate",
    flag: "cited:refugee-distress-pirate",
    aliases: ["Refugee distress (Pirate)"],
    sectors: ["Pirate Controlled Sector"],
    body: "You have encountered a refugee ship drifting in space. It looks as if it was fleeing the Rebel advance and ran out of fuel. Its distress beacon is active, but you're not sure anyone is on board.",
    choices: [
      { id: "c:refugee-distress-pirate:0", label: "Hail them.", fx: [{ k: "note", text: "A trade, or a pirate ship using them as bait." }] },
      { id: "c:refugee-distress-pirate:1", label: "Ignore the refugees.", fx: [{ k: "nothing" }] },
    ],
  },
  // Research station with no response. Pirate Controlled Sector. unique=true. LRSmap=noship.
  // The noinclude intro. Dock, leave, the Anti-Personnel Drone, and the Lifeform Scanner run in quests-b.ts.
  // The includeonly intro stays on Merchant's Delivery.
  {
    dest: "Research station with no response",
    slug: "research-station-with-no-response",
    flag: "cited:research-station-with-no-response",
    aliases: ["Research station with no response"],
    sectors: ["Pirate Controlled Sector"],
    body: "You arrive to find a small research station putting out a distress signal. There is no response to your hails.",
    choices: [
      { id: "c:research-station-with-no-response:0", label: "Dock with the station and investigate.", fx: [{ k: "note", text: "The station investigation." }] },
      { id: "c:research-station-with-no-response:1", label: "Leave it alone.", fx: [{ k: "nothing" }] },
      { id: "c:research-station-with-no-response:2", label: "Send your battle drone in to help.", fx: [{ k: "note", text: "Nothing, or medium scrap with resources." }] },
      { id: "c:research-station-with-no-response:3", label: "Run advanced life scans.", fx: [{ k: "note", text: "Medium scrap with resources, or nothing." }] },
    ],
  },
];

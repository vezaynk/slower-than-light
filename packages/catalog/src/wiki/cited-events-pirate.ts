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
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector, Uncharted Nebula." — [[Pirate fight in nebula]]
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight in nebula]]
    flag: "cited:pirate-fight-in-nebula",
    aliases: ["Pirate fight in nebula"],
    sectors: ["Pirate Controlled Sector", "Uncharted Nebula"],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-in-nebula:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight in nebula]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  // Refugee (Pirate). Template:Drifting Refugee Ship, introtext=nodistress, type=pirate.
  // Pirate Controlled Sector. unique=false. LRSmap=noship.
  // Hail is a trade or the pirate bait. type=pirate does not wrap the trade in DuplicateEvent|4.
  {
    dest: "Refugee (Pirate)",
    slug: "refugee-pirate",
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector." — [[Refugee (Pirate)]]
    flag: "cited:refugee-pirate",
    aliases: ["Refugee (Pirate)"],
    sectors: ["Pirate Controlled Sector"],
    body: "Refugee ship.",
    choices: [
      {
        id: "c:refugee-pirate:0",
        label: "1 in 2: trade. 1 in 2: fight a pirate ship.",
        fx: [{ k: "note", text: "1 in 2: trade. 1 in 2: fight a pirate ship." }],
      },
      { id: "c:refugee-pirate:1", label: "Nothing happens.", fx: [{ k: "nothing" }] },
    ],
  },
  // Refugee distress (Pirate). Template:Drifting Refugee Ship, introtext=distress, type=pirate.
  // Pirate Controlled Sector. distress=true. unique=false. LRSmap=noship.
  // The same type=pirate hail. Not on the EventList distress beacon list.
  {
    dest: "Refugee distress (Pirate)",
    slug: "refugee-distress-pirate",
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector." — [[Refugee distress (Pirate)]]
    flag: "cited:refugee-distress-pirate",
    aliases: ["Refugee distress (Pirate)"],
    sectors: ["Pirate Controlled Sector"],
    body: "Refugee ship.",
    choices: [
      {
        id: "c:refugee-distress-pirate:0",
        label: "1 in 2: trade. 1 in 2: fight a pirate ship.",
        fx: [{ k: "note", text: "1 in 2: trade. 1 in 2: fight a pirate ship." }],
      },
      { id: "c:refugee-distress-pirate:1", label: "Nothing happens.", fx: [{ k: "nothing" }] },
    ],
  },
  // Research station with no response. Pirate Controlled Sector. unique=true. LRSmap=noship.
  // The noinclude intro. Dock, leave, the Anti-Personnel Drone, and the Lifeform Scanner run in quests-b.ts.
  // The includeonly intro stays on Merchant's Delivery.
  {
    dest: "Research station with no response",
    slug: "research-station-with-no-response",
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector." — [[Research station with no response]]
    // > "It is unique." — [[Research station with no response]]
    // > "You arrive to find a small research station putting out a distress signal. There is no response to your hails." — [[Research station with no response]]
    flag: "cited:research-station-with-no-response",
    aliases: ["Research station with no response"],
    sectors: ["Pirate Controlled Sector"],
    body: "Station. No response.",
    choices: [
      {
        id: "c:research-station-with-no-response:0",
        // Wiki citations:
        // > "Dock with the station and investigate." — [[Research station with no response]]
        label:
          "1 in 3: gain medium scrap and drone parts. 1 in 3: gain 1 crew, more options. 1 in 3: more options.",
        fx: [
          {
            k: "note",
            text: "1 in 3: gain medium scrap and drone parts. 1 in 3: gain 1 crew, more options. 1 in 3: more options.",
          },
        ],
      },
      {
        id: "c:research-station-with-no-response:1",
        // Wiki citations:
        // > "Leave it alone." — [[Research station with no response]]
        // > "Nothing happens." — [[Research station with no response]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:research-station-with-no-response:2",
        // Wiki citations:
        // > "(Anti-Personnel Drone) Send your battle drone in to help. [ Drone parts lost: 1 ]" — [[Research station with no response]]
        label: "Lose 1 drone part. 1 in 3: gain medium scrap and resources.",
        fx: [{ k: "note", text: "Lose 1 drone part. 1 in 3: gain medium scrap and resources." }],
      },
      {
        id: "c:research-station-with-no-response:3",
        // Wiki citations:
        // > "(Life Scanner) Run advanced life scans." — [[Research station with no response]]
        label: "1 in 2: nothing happens. 1 in 2: gain medium scrap and resources.",
        fx: [
          { k: "note", text: "1 in 2: nothing happens. 1 in 2: gain medium scrap and resources." },
        ],
      },
    ],
  },
];

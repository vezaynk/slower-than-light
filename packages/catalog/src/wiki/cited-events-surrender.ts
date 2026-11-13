/**
 * @agent:surrender. Category:Ship surrender Events pages that no other cited table wires. Same format as the other
 * cited-events-*.ts tables: one card per page, stamped only in the sectors its {{Locations}} line names.
 *
 * Choices whose page outcome is random (two or more results, odds not stated), or that open a follow-up dialogue,
 * are taken over by wiki/surrender.ts (PAGE_CHOICES, routed through surrenderChoose before citedChoose). Their `fx`
 * below is what this table format can say about them; surrender.ts holds the full branch with its quotes.
 *
 * @agent:quests. Slug comm tapping and Engi fleet discussion: their surrender fights sit at quest-marker beacons. The
 * opening cards are below; the choices that add a marker run in wiki/quests.ts (QUEST_CHOICES, routed through
 * surrenderChoose before citedChoose), and the marker fights use the "quest-*" rows in surrender.ts.
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "quest"; id: string }
  | { k: "goto"; id: string }
  | { k: "close" }
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
    dest: "Surrendering Engi ship",
    slug: "engi-surrender",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Engi surrender]]
    // > "It is unique." — [[Engi surrender]]
    // > "An Engi ship in the vicinity, seeing you jump in armed to the teeth, immediately broadcasts its surrender. \"Subject goal: wealth. Engi motivation: survival. Transfer of goods acceptable?\"" — [[Engi surrender]]
    flag: "cited:engi-surrender",
    aliases: [],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "Engi ship. Offer: its cargo.",
    choices: [
      {
        id: "c:engi-surrender:0",
        // Wiki citations:
        // > "Explain that you're friendly." — [[Engi surrender]]
        label: "1 in 2: nothing happens. 1 in 2: gain scrap and resources.",
        // "You receive a random amount of scrap with resources." Random branch: surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: "1 in 2: nothing happens. 1 in 2: gain scrap and resources." }],
      },
      {
        id: "c:engi-surrender:1",
        // Wiki citations:
        // > "Accept their offer of surrender." — [[Engi surrender]]
        label: "Gain scrap and resources.",
        // "You receive a random amount of scrap with resources." Rolled in surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: "Gain scrap and resources." }],
      },
    ],
  },
  {
    dest: "Floating cargo",
    slug: "destroyed-cargo-ship",
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector." — [[Destroyed cargo ship]]
    // > "It is unique." — [[Destroyed cargo ship]]
    // > "Not too far from the beacon, you detect a destroyed cargo ship with its cargo scattered nearby, intact." — [[Destroyed cargo ship]]
    flag: "cited:destroyed-cargo-ship",
    aliases: [],
    sectors: ["Pirate Controlled Sector"],
    body: "Cargo near a wreck.",
    choices: [
      {
        id: "c:destroyed-cargo-ship:0",
        // Wiki citations:
        // > "Bring it aboard." — [[Destroyed cargo ship]]
        label:
          "1 in 4: gain medium scrap and resources. 1 in 4: gain low scrap. 1 in 4: 2-4 Human boarders. 1 in 4: 2-4 Human boarders and a fight.",
        // "beam aboard your ship and you fight a Pirate ship" Random branch: surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:destroyed-cargo-ship:1",
        // Wiki citations:
        // > "Leave it alone, this looks suspicious." — [[Destroyed cargo ship]]
        label: "Nothing happens.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:destroyed-cargo-ship:2",
        // Wiki citations:
        // > "(Advanced Sensors) Run an advanced scan on the boxes. (Requires level 2+ Sensors)" — [[Destroyed cargo ship]]
        // > "Scan the boxes." — [[Destroyed cargo ship]]
        label:
          "1 in 3: gain 20-35 scrap. 1 in 3: gain medium scrap and resources. 1 in 3: more options.",
        // Advanced Sensors level=2+. Three scan results: surrender.ts PAGE_CHOICES.
        fx: [
          {
            k: "note",
            text: "1 in 3: gain 20-35 scrap. 1 in 3: gain medium scrap and resources. 1 in 3: more options.",
          },
        ],
      },
      {
        id: "c:destroyed-cargo-ship:3",
        // Wiki citations:
        // > "(Long-Ranged Scanners) Run an advanced scan on the boxes." — [[Destroyed cargo ship]]
        // > "Scan the boxes." — [[Destroyed cargo ship]]
        label:
          "1 in 3: gain 20-35 scrap. 1 in 3: gain medium scrap and resources. 1 in 3: more options.",
        // Long-Ranged Scanners. The same three scan results: surrender.ts PAGE_CHOICES.
        fx: [
          {
            k: "note",
            text: "1 in 3: gain 20-35 scrap. 1 in 3: gain medium scrap and resources. 1 in 3: more options.",
          },
        ],
      },
    ],
  },
  {
    dest: "Quest offer: settlement",
    slug: "settlement-mercenary-work",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rock Controlled Sector, Rock Homeworlds." — [[Settlement mercenary work]]
    // > "It is unique." — [[Settlement mercenary work]]
    // > "You are immediately contacted by a settlement, \"Hello, travelers. Your ship seems to be outfitted for combat...care to take up a bit of mercenary work?\"" — [[Settlement mercenary work]]
    flag: "cited:settlement-mercenary-work",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
    ],
    body: "Quest offer.",
    choices: [
      {
        id: "c:settlement-mercenary-work:0",
        // Wiki citations:
        // > "Listen to their offer." — [[Settlement mercenary work]]
        label: "More options.",
        // "Fight a Pirate ship." One of two offers: surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:settlement-mercenary-work:1",
        // Wiki citations:
        // > "Decline." — [[Settlement mercenary work]]
        // > "Nothing happens." — [[Settlement mercenary work]]
        label: "Nothing happens.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "Hostile Slug pirate ship",
    slug: "the-black-raven",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[The Black Raven]]
    // > "It is unique." — [[The Black Raven]]
    // > "As you jump in, you immediately see an impressive Slug pirate ship with \"The Black Raven\" painted on one side. They hail you, \"Greetingsss. I am the dreaded pirate, Captain Nights. You mussst be full of fear, no? You have heard of me... no?\"" — [[The Black Raven]]
    flag: "cited:the-black-raven",
    aliases: [],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "Slug pirate ship.",
    choices: [
      {
        id: "c:the-black-raven:0",
        label: "More options.",
        // "Fight the Black Raven" Dialogue first: surrender.ts PAGE_CHOICES. INFERRED tier: a Slug pirate ship.
        fx: [{ k: "fight", tier: "Slug pirate ship" }],
      },
    ],
  },
  {
    dest: "Docking request: Zoltan ship",
    slug: "zoltan-ship-asks-to-dock",
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan ship asks to dock]]
    // > "It is unique." — [[Zoltan ship asks to dock]]
    // > "What appears to be a Zoltan science ship requests permission to dock." — [[Zoltan ship asks to dock]]
    flag: "cited:zoltan-ship-asks-to-dock",
    // "Zoltan science ship" is the same page under its old title (the dump keeps both with the same text).
    aliases: [],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "Zoltan ship. Request: dock.",
    choices: [
      {
        id: "c:zoltan-ship-asks-to-dock:0",
        // Wiki citations:
        // > "Dock with them." — [[Zoltan ship asks to dock]]
        label: "1 in 2: fight the Zoltan ship. 1 in 2: gain medium resources.",
        // "Fight a Zoltan ship." Random branch (fight or gift): surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Zoltan ship" }],
      },
      {
        id: "c:zoltan-ship-asks-to-dock:1",
        // Wiki citations:
        // > "Have them keep their distance." — [[Zoltan ship asks to dock]]
        label: "Nothing happens.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // @agent:quests. "Slug comm tapping" ({{Locations|Slug Controlled Nebula|Slug Home Nebula|...}}).
  {
    dest: "Quest: tap Slug comms",
    slug: "slug-comm-tapping",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug comm tapping]]
    // > "It is unique." — [[Slug comm tapping]]
    // > "You arrive to the sight of two Slug ships in communication range. They don't see you." — [[Slug comm tapping]]
    flag: "cited:slug-comm-tapping",
    aliases: [],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "Two Slug ships. Nebula.",
    choices: [
      {
        id: "c:slug-comm-tapping:0",
        // Wiki citations:
        // > "Tap their comm frequency." — [[Slug comm tapping]]
        label: "Quest beacon added.",
        fx: [
          {
            k: "note",
            text: "Quest beacon added.",
          },
          { k: "quest", id: "slug-pirate-trap" },
        ],
      },
      {
        id: "c:slug-comm-tapping:1",
        // Wiki citations:
        // > "Ignore them." — [[Slug comm tapping]]
        label: "Nothing happens.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // @agent:quests. "Engi fleet discussion" ({{Locations|Engi Homeworlds|...}}), the Stealth Cruiser unlocking event.
  {
    dest: "Engi ships: Engi crew quest",
    slug: "engi-fleet-discussion",
    // Wiki citations:
    // > "This random event occurs in Engi Homeworlds." — [[Engi fleet discussion]]
    // > "It is unique." — [[Engi fleet discussion]]
    // > "This is the Stealth Cruiser ship unlocking event." — [[Engi fleet discussion]]
    // > "You arrive near a small fleet of civilian Engi ships. A simple decryption and translation of their comm frequency tells you that they are having a frantic discussion about something obviously troubling them." — [[Engi fleet discussion]]
    flag: "cited:engi-fleet-discussion",
    aliases: [],
    sectors: ["Engi Homeworlds"],
    body: "Engi ships.",
    choices: [
      {
        id: "c:engi-fleet-discussion:0",
        // Wiki citations:
        // > "Message them and ask if you can help." — [[Engi fleet discussion]]
        label: "Nothing happens.",
        // "Nothing happens." (after the leader declines; the reply text is in wiki/quests.ts)
        fx: [{ k: "note", text: "Nothing happens." }],
      },
      {
        id: "c:engi-fleet-discussion:1",
        // Wiki citations:
        // > "Ignore it and move on." — [[Engi fleet discussion]]
        label: "Nothing happens.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:engi-fleet-discussion:2",
        // Wiki citations:
        // > "(Engi Crew) Have your Engi crewmember contact them." — [[Engi fleet discussion]]
        // {{Blue Option|Engi Crew|...}}: needs an Engi crewmember (wiki/quests.ts questChoiceDisabled).
        label: "Two quest beacons added.",
        fx: [{ k: "note", text: "Two quest beacons added." }],
      },
    ],
  },
];

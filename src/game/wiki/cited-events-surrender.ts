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
    dest: "Engi surrender",
    slug: "engi-surrender",
    flag: "cited:engi-surrender",
    aliases: ["Engi surrender", "Engi Surrender"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "An Engi ship in the vicinity, seeing you jump in armed to the teeth, immediately broadcasts its surrender. \"Subject goal: wealth. Engi motivation: survival. Transfer of goods acceptable?\"",
    choices: [
      {
        id: "c:engi-surrender:0",
        label: "Explain that you're friendly.",
        // "You receive a random amount of scrap with resources." Random branch: surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: "The Engi answer." }],
      },
      {
        id: "c:engi-surrender:1",
        label: "Accept their offer of surrender.",
        // "You receive a random amount of scrap with resources." Rolled in surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: "The Engi transfer the goods." }],
      },
    ],
  },
  {
    dest: "Destroyed cargo ship",
    slug: "destroyed-cargo-ship",
    flag: "cited:destroyed-cargo-ship",
    aliases: ["Destroyed cargo ship", "Destroyed Cargo Ship"],
    sectors: ["Pirate Controlled Sector"],
    body: "Not too far from the beacon, you detect a destroyed cargo ship with its cargo scattered nearby, intact.",
    choices: [
      {
        id: "c:destroyed-cargo-ship:0",
        label: "Bring it aboard.",
        // "beam aboard your ship and you fight a Pirate ship" Random branch: surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:destroyed-cargo-ship:1",
        label: "Leave it alone, this looks suspicious.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "Settlement mercenary work",
    slug: "settlement-mercenary-work",
    flag: "cited:settlement-mercenary-work",
    aliases: ["Settlement mercenary work", "Settlement Mercenary Work"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
    ],
    body: "You are immediately contacted by a settlement, \"Hello, travelers. Your ship seems to be outfitted for combat...care to take up a bit of mercenary work?\"",
    choices: [
      {
        id: "c:settlement-mercenary-work:0",
        label: "Listen to their offer.",
        // "Fight a Pirate ship." One of two offers: surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:settlement-mercenary-work:1",
        label: "Decline.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "The Black Raven",
    slug: "the-black-raven",
    flag: "cited:the-black-raven",
    aliases: ["The Black Raven"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "As you jump in, you immediately see an impressive Slug pirate ship with \"The Black Raven\" painted on one side. They hail you, \"Greetingsss. I am the dreaded pirate, Captain Nights. You mussst be full of fear, no? You have heard of me... no?\"",
    choices: [
      {
        id: "c:the-black-raven:0",
        label: "No.",
        // "Fight the Black Raven" Dialogue first: surrender.ts PAGE_CHOICES. INFERRED tier: a Slug pirate ship.
        fx: [{ k: "fight", tier: "Slug pirate ship" }],
      },
    ],
  },
  {
    dest: "Zoltan ship asks to dock",
    slug: "zoltan-ship-asks-to-dock",
    flag: "cited:zoltan-ship-asks-to-dock",
    // "Zoltan science ship" is the same page under its old title (the dump keeps both with the same text).
    aliases: ["Zoltan ship asks to dock", "Zoltan science ship"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "What appears to be a Zoltan science ship requests permission to dock.",
    choices: [
      {
        id: "c:zoltan-ship-asks-to-dock:0",
        label: "Dock with them.",
        // "Fight a Zoltan ship." Random branch (fight or gift): surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Zoltan ship" }],
      },
      {
        id: "c:zoltan-ship-asks-to-dock:1",
        label: "Have them keep their distance.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // @agent:quests. "Slug comm tapping" ({{Locations|Slug Controlled Nebula|Slug Home Nebula|...}}).
  {
    dest: "Slug comm tapping",
    slug: "slug-comm-tapping",
    flag: "cited:slug-comm-tapping",
    aliases: ["Slug comm tapping", "Slug Comm Tapping"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You arrive to the sight of two Slug ships in communication range. They don't see you.",
    choices: [
      {
        id: "c:slug-comm-tapping:0",
        label: "Tap their comm frequency.",
        // "A quest marker is added to your map." wiki/quests.ts QUEST_CHOICES adds it.
        fx: [{ k: "note", text: "A quest marker is added to your map." }],
      },
      {
        id: "c:slug-comm-tapping:1",
        label: "Ignore them.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // @agent:quests. "Engi fleet discussion" ({{Locations|Engi Homeworlds|...}}), the Stealth Cruiser unlocking event.
  {
    dest: "Engi fleet discussion",
    slug: "engi-fleet-discussion",
    flag: "cited:engi-fleet-discussion",
    aliases: ["Engi fleet discussion", "Engi Fleet Discussion"],
    sectors: ["Engi Homeworlds"],
    body: "You arrive near a small fleet of civilian Engi ships. A simple decryption and translation of their comm frequency tells you that they are having a frantic discussion about something obviously troubling them.",
    choices: [
      {
        id: "c:engi-fleet-discussion:0",
        label: "Message them and ask if you can help.",
        // "Nothing happens." (after the leader declines; the reply text is in wiki/quests.ts)
        fx: [{ k: "note", text: "They decline." }],
      },
      {
        id: "c:engi-fleet-discussion:1",
        label: "Ignore it and move on.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:engi-fleet-discussion:2",
        // {{Blue Option|Engi Crew|...}}: needs an Engi crewmember (wiki/quests.ts questChoiceDisabled).
        label: "Have your Engi crewmember contact them.",
        fx: [{ k: "note", text: "Two quest markers are added to your map." }],
      },
    ],
  },
];
